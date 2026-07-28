import { NextResponse } from "next/server"
import YahooFinance from "yahoo-finance2"

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] })

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 })
  }

  const symbolUpper = symbol.toUpperCase().trim()
  const currentYear = new Date().getFullYear()
  const startYear = currentYear - 5
  const period1 = `${startYear}-01-01`

  try {
    // Execute fundamental time series queries and quoteSummary in parallel
    const [annualTS, quarterlyTS, summary] = await Promise.all([
      yahooFinance
        .fundamentalsTimeSeries(symbolUpper, {
          period1,
          type: "annual",
          module: "all",
        })
        .catch((e) => {
          console.warn(`Annual fundamentalsTimeSeries warning for ${symbolUpper}:`, e.message)
          return []
        }),
      yahooFinance
        .fundamentalsTimeSeries(symbolUpper, {
          period1: `${currentYear - 2}-01-01`,
          type: "quarterly",
          module: "all",
        })
        .catch((e) => {
          console.warn(`Quarterly fundamentalsTimeSeries warning for ${symbolUpper}:`, e.message)
          return []
        }),
      yahooFinance
        .quoteSummary(symbolUpper, {
          modules: [
            "incomeStatementHistory",
            "incomeStatementHistoryQuarterly",
            "balanceSheetHistory",
            "balanceSheetHistoryQuarterly",
            "cashflowStatementHistory",
            "cashflowStatementHistoryQuarterly",
            "secFilings",
            "financialData",
            "summaryDetail",
            "price",
            "defaultKeyStatistics",
          ],
        })
        .catch((e) => {
          console.warn(`quoteSummary warning for ${symbolUpper}:`, e.message)
          return {} as any
        }),
    ])

    const companyName = summary.price?.longName || summary.price?.shortName || symbolUpper
    const currency = summary.price?.currency || "USD"

    // Helper parser for fundamentalsTimeSeries records
    const parseTSIncome = (list: any[]) =>
      list
        .filter((item) => item.date)
        .map((item) => {
          const rev = item.totalRevenue ?? item.operatingRevenue ?? null
          const cost = item.costOfRevenue ?? item.reconciledCostOfRevenue ?? null
          const gross = item.grossProfit ?? (rev !== null && cost !== null ? rev - cost : null)
          const net =
            item.netIncome ??
            item.netIncomeCommonStockholders ??
            item.netIncomeFromContinuingOperationNetMinorityInterest ??
            item.netIncomeFromContinuingOps ??
            null

          return {
            endDate: new Date(item.date).toISOString().split("T")[0],
            totalRevenue: rev,
            costOfRevenue: cost,
            grossProfit: gross,
            operatingExpenses:
              item.operatingExpense ??
              item.operatingExpenses ??
              item.totalOperatingExpenses ??
              item.sellingGeneralAndAdministration ??
              null,
            operatingIncome: item.operatingIncome ?? gross ?? null,
            netIncome: net,
            ebit: item.ebit ?? item.pretaxIncome ?? null,
          }
        })
        .filter((x) => x.totalRevenue !== null || x.netIncome !== null)
        .reverse()

    const parseTSBalance = (list: any[]) =>
      list
        .filter((item) => item.date)
        .map((item) => {
          const cash =
            item.cashAndCashEquivalents ??
            item.cashCashEquivalentsAndShortTermInvestments ??
            item.cashEquivalents ??
            item.cashFinancial ??
            item.cash ??
            null
          const assets = item.totalAssets ?? item.TotalAssets ?? null
          const liab =
            item.totalLiabilitiesNetMinorityInterest ??
            item.totalLiabilitiesNetTotal ??
            item.totalLiabilities ??
            item.totalLiab ??
            null
          const equity =
            item.stockholdersEquity ??
            item.commonStockEquity ??
            item.totalEquityGrossMinorityInterest ??
            item.totalStockholderEquity ??
            (assets !== null && liab !== null ? assets - liab : null)

          return {
            endDate: new Date(item.date).toISOString().split("T")[0],
            cash,
            totalAssets: assets,
            totalLiab: liab,
            totalStockholderEquity: equity,
            totalDebt: item.totalDebt ?? item.longTermDebtAndCapitalLeaseObligation ?? null,
            workingCapital: item.workingCapital ?? item.changeInWorkingCapital ?? null,
          }
        })
        .filter((x) => x.totalAssets !== null || x.cash !== null || x.totalStockholderEquity !== null)
        .reverse()

    const parseTSCashflow = (list: any[]) =>
      list
        .filter((item) => item.date)
        .map((item) => {
          const operating = item.operatingCashFlow ?? item.totalCashFromOperatingActivities ?? null
          const capex = item.capitalExpenditure ?? item.purchaseOfPPE ?? item.capitalExpenditures ?? null
          const fcf = item.freeCashFlow ?? (operating !== null && capex !== null ? operating + capex : null)

          return {
            endDate: new Date(item.date).toISOString().split("T")[0],
            operatingCashflow: operating,
            capitalExpenditures: capex,
            freeCashFlow: fcf,
            dividendsPaid: item.cashDividendsPaid ?? item.commonStockDividendPaid ?? item.dividendsPaid ?? null,
          }
        })
        .filter((x) => x.operatingCashflow !== null || x.freeCashFlow !== null)
        .reverse()

    // 1. Process Income Statements
    let incomeStatements = parseTSIncome(annualTS)
    let incomeStatementsQuarterly = parseTSIncome(quarterlyTS)

    // Legacy fallback if TS returns nothing
    if (incomeStatements.length === 0 && summary.incomeStatementHistory?.incomeStatementHistory) {
      incomeStatements = summary.incomeStatementHistory.incomeStatementHistory.map((item: any) => ({
        endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "N/A",
        totalRevenue: item.totalRevenue ?? item.revenue ?? null,
        costOfRevenue: item.costOfRevenue ?? null,
        grossProfit: item.grossProfit ?? null,
        operatingExpenses: item.totalOperatingExpenses ?? null,
        operatingIncome: item.operatingIncome ?? null,
        netIncome: item.netIncome ?? item.netIncomeApplicableToCommonShares ?? null,
        ebit: item.ebit ?? null,
      }))
    }

    if (incomeStatementsQuarterly.length === 0 && summary.incomeStatementHistoryQuarterly?.incomeStatementHistory) {
      incomeStatementsQuarterly = summary.incomeStatementHistoryQuarterly.incomeStatementHistory.map((item: any) => ({
        endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "N/A",
        totalRevenue: item.totalRevenue ?? item.revenue ?? null,
        costOfRevenue: item.costOfRevenue ?? null,
        grossProfit: item.grossProfit ?? null,
        operatingExpenses: item.totalOperatingExpenses ?? null,
        operatingIncome: item.operatingIncome ?? null,
        netIncome: item.netIncome ?? item.netIncomeApplicableToCommonShares ?? null,
        ebit: item.ebit ?? null,
      }))
    }

    // 2. Process Balance Sheets
    let balanceSheets = parseTSBalance(annualTS)
    let balanceSheetsQuarterly = parseTSBalance(quarterlyTS)

    if (balanceSheets.length === 0 && summary.balanceSheetHistory?.balanceSheetStatements) {
      balanceSheets = summary.balanceSheetHistory.balanceSheetStatements.map((item: any) => ({
        endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "N/A",
        cash: item.cash ?? item.cashAndCashEquivalents ?? null,
        totalAssets: item.totalAssets ?? null,
        totalLiab: item.totalLiab ?? item.totalLiabilities ?? null,
        totalStockholderEquity: item.totalStockholderEquity ?? item.commonStockEquity ?? null,
        totalDebt: item.longTermDebt !== undefined ? (item.longTermDebt || 0) + (item.shortLongTermDebt || 0) : null,
        workingCapital: item.netWorkingCapital ?? null,
      }))
    }

    if (balanceSheetsQuarterly.length === 0 && summary.balanceSheetHistoryQuarterly?.balanceSheetStatements) {
      balanceSheetsQuarterly = summary.balanceSheetHistoryQuarterly.balanceSheetStatements.map((item: any) => ({
        endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "N/A",
        cash: item.cash ?? item.cashAndCashEquivalents ?? null,
        totalAssets: item.totalAssets ?? null,
        totalLiab: item.totalLiab ?? item.totalLiabilities ?? null,
        totalStockholderEquity: item.totalStockholderEquity ?? item.commonStockEquity ?? null,
        totalDebt: item.longTermDebt !== undefined ? (item.longTermDebt || 0) + (item.shortLongTermDebt || 0) : null,
        workingCapital: item.netWorkingCapital ?? null,
      }))
    }

    // 3. Process Cash Flow Statements
    let cashflowStatements = parseTSCashflow(annualTS)
    let cashflowStatementsQuarterly = parseTSCashflow(quarterlyTS)

    if (cashflowStatements.length === 0 && summary.cashflowStatementHistory?.cashflowStatements) {
      cashflowStatements = summary.cashflowStatementHistory.cashflowStatements.map((item: any) => {
        const operating = item.totalCashFromOperatingActivities ?? item.operatingCashflow ?? null
        const capex = item.capitalExpenditures ?? null
        return {
          endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "N/A",
          operatingCashflow: operating,
          capitalExpenditures: capex,
          freeCashFlow: operating !== null && capex !== null ? operating + capex : null,
          dividendsPaid: item.dividendsPaid ?? null,
        }
      })
    }

    if (cashflowStatementsQuarterly.length === 0 && summary.cashflowStatementHistoryQuarterly?.cashflowStatements) {
      cashflowStatementsQuarterly = summary.cashflowStatementHistoryQuarterly.cashflowStatements.map((item: any) => {
        const operating = item.totalCashFromOperatingActivities ?? item.operatingCashflow ?? null
        const capex = item.capitalExpenditures ?? null
        return {
          endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "N/A",
          operatingCashflow: operating,
          capitalExpenditures: capex,
          freeCashFlow: operating !== null && capex !== null ? operating + capex : null,
          dividendsPaid: item.dividendsPaid ?? null,
        }
      })
    }

    // 4. Process Key Metrics & Ratios
    const finData = summary.financialData || {}
    const sumDetail = summary.summaryDetail || {}
    const stats = summary.defaultKeyStatistics || {}

    const keyMetrics = {
      peRatio: sumDetail.trailingPE ?? sumDetail.forwardPE ?? null,
      pbRatio: stats.priceToBook ?? null,
      roe: finData.returnOnEquity ? finData.returnOnEquity * 100 : null,
      payoutRatio: sumDetail.payoutRatio ? sumDetail.payoutRatio * 100 : null,
      dividendYield: sumDetail.trailingAnnualDividendYield
        ? sumDetail.trailingAnnualDividendYield * 100
        : sumDetail.yield
        ? sumDetail.yield * 100
        : null,
      currentPrice: summary.price?.regularMarketPrice ?? finData.currentPrice ?? null,
    }

    // 5. SEC / Report Filings
    const rawFilings = summary.secFilings?.filings || []
    const secFilings = rawFilings.slice(0, 10).map((f: any) => ({
      date: f.date || "N/A",
      title: f.title || f.type || "Official Filing",
      type: f.type || "Filing",
      url: f.edgarUrl || `https://finance.yahoo.com/quote/${symbolUpper}/financials`,
    }))

    return NextResponse.json(
      {
        symbol: symbolUpper,
        companyName,
        currency,
        incomeStatements,
        incomeStatementsQuarterly,
        balanceSheets,
        balanceSheetsQuarterly,
        cashflowStatements,
        cashflowStatementsQuarterly,
        keyMetrics,
        secFilings,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      }
    )
  } catch (error: any) {
    console.error(`Failed to fetch financial report for ${symbolUpper}:`, error)
    return NextResponse.json({ error: error.message || "Failed to fetch financial statements" }, { status: 500 })
  }
}

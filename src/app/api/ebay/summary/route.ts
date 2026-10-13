import { NextResponse } from "next/server";
import {
  getActiveListingsCount,
  getActiveReturnsCount,
  getDailyRevenue,
  getFeedbackSummary,
  getRecentOrders,
  getSummary,
  getTrafficReport
} from "@/lib/ebay";

/**
 * GET /api/ebay/summary
 * Retourne les KPI consolidés + commandes récentes + ventes journalières + feedback + trafic.
 */
export async function GET() {
  try {
    const [summary, orders, daily, listings, feedback, traffic, returns] = await Promise.all([
      getSummary(),
      getRecentOrders(12),
      getDailyRevenue(30),
      getActiveListingsCount(),
      getFeedbackSummary(),
      getTrafficReport(90),
      getActiveReturnsCount()
    ]);
    return NextResponse.json(
      { ...summary, listings, orders, daily, feedback, traffic, returns },
      { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

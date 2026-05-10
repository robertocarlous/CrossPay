import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // For now, return a simple explanation
    return NextResponse.json({
      explanation: "This route will bridge USDC from your selected chain to Solana using the most efficient bridge available."
    });
  } catch (error) {
    return NextResponse.json({ explanation: '' });
  }
}
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Simple but effective parser
    const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*USDC?/i);
    const addressMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);

    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
    const recipient = addressMatch ? addressMatch[0] : null;

    // Detect source chain
    let fromChain = 'base';
    const lowerText = text.toLowerCase();
    if (lowerText.includes('arbitrum')) fromChain = 'arbitrum';
    else if (lowerText.includes('optimism')) fromChain = 'optimism';
    else if (lowerText.includes('polygon')) fromChain = 'polygon';
    else if (lowerText.includes('ethereum') || lowerText.includes('eth')) fromChain = 'ethereum';

    if (!amount || !recipient) {
      return NextResponse.json({
        data: null,
        error: 'Could not extract amount or recipient'
      });
    }

    return NextResponse.json({
      data: {
        amount,
        recipient,
        fromChain,
      }
    });

  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse payment intent' },
      { status: 500 }
    );
  }
}
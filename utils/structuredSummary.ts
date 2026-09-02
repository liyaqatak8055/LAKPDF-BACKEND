/**
 * Structured Summary Generator
 * Generates structured summaries from various document types
 */

interface DocumentSummary {
  type: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
}

export function generateStructuredSummary(text: string): DocumentSummary {
  // Detect document type and generate appropriate summary
  const lowerText = text.toLowerCase();
  
  // Train ticket detection
  if (lowerText.includes('pnr') || lowerText.includes('railway') || lowerText.includes('train')) {
    return {
      type: 'TRAIN_TICKET',
      title: 'Train Ticket',
      content: text,
      metadata: extractTrainTicketMetadata(text)
    };
  }

  // Bus ticket detection
  if (lowerText.includes('bus') || lowerText.includes('coach')) {
    return {
      type: 'BUS_TICKET',
      title: 'Bus Ticket',
      content: text,
      metadata: extractBusTicketMetadata(text)
    };
  }

  // Flight ticket detection
  if (lowerText.includes('flight') || lowerText.includes('airline') || lowerText.includes('booking reference')) {
    return {
      type: 'FLIGHT_TICKET',
      title: 'Flight Ticket',
      content: text,
      metadata: extractFlightTicketMetadata(text)
    };
  }

  // Resume detection
  if (lowerText.includes('experience') || lowerText.includes('education') || lowerText.includes('skills')) {
    return {
      type: 'RESUME',
      title: 'Resume',
      content: text,
      metadata: extractResumeMetadata(text)
    };
  }

  // Default generic document
  return {
    type: 'DOCUMENT',
    title: 'Document',
    content: text,
    metadata: {}
  };
}

function extractTrainTicketMetadata(text: string): Record<string, any> {
  const metadata: Record<string, any> = {
    pnr: extractPNR(text),
    trainNumber: extractTrainNumber(text),
    passengers: [],
    journey: {}
  };
  return metadata;
}

function extractBusTicketMetadata(text: string): Record<string, any> {
  return {
    busNumber: '',
    passengers: [],
    journey: {}
  };
}

function extractFlightTicketMetadata(text: string): Record<string, any> {
  return {
    bookingReference: '',
    passengers: [],
    journey: {}
  };
}

function extractResumeMetadata(text: string): Record<string, any> {
  return {
    name: '',
    experience: [],
    education: [],
    skills: []
  };
}

function extractPNR(text: string): string | undefined {
  const pnrMatch = text.match(/\b[A-Z0-9]{10}\b/);
  return pnrMatch ? pnrMatch[0] : undefined;
}

function extractTrainNumber(text: string): string | undefined {
  const trainMatch = text.match(/train\s*#?\s*(\d+)/i);
  return trainMatch ? trainMatch[1] : undefined;
}

import { claude4 } from '../../../llmModels/claude4';

/**
 * Service for summarizing phone call transcripts
 * Converts ElevenLabs transcript arrays into readable conversation summaries
 */

export interface SummarizePhoneTranscriptRequest {
  transcript: any[];  // ElevenLabs transcript array with speaker labels and timestamps
  callDuration?: number;  // Duration in seconds
  analysis?: any;  // ElevenLabs analysis object (call_summary_title, transcript_summary, etc.)
  metadata?: any;  // Additional call metadata
  direction?: 'inbound' | 'outbound';  // Call direction
}

export interface SummarizePhoneTranscriptResult {
  success: boolean;
  summary: string;  // Formatted conversation summary string
  error?: string;
}

/**
 * Summarize phone transcript into readable conversation format
 * Uses Claude 4 to create a concise, contextual summary from the raw transcript
 */
export async function summarizePhoneTranscript(
  request: SummarizePhoneTranscriptRequest
): Promise<SummarizePhoneTranscriptResult> {
  try {
    console.log('=� Starting phone transcript summarization');
    console.log(`  - Transcript entries: ${request.transcript.length}`);
    console.log(`  - Call duration: ${request.callDuration || 'N/A'} seconds`);
    console.log(`  - Direction: ${request.direction || 'N/A'}`);

    // If transcript is empty, return basic summary
    if (!request.transcript || request.transcript.length === 0) {
      const fallbackSummary = request.analysis?.call_summary_title ||
                             request.analysis?.transcript_summary ||
                             `Phone call completed${request.callDuration ? ` (${formatDuration(request.callDuration)})` : ''}`;

      return {
        success: true,
        summary: fallbackSummary
      };
    }

    // Build prompt for Claude 4
    const prompt = buildTranscriptSummaryPrompt(request);

    console.log(`  - Prompt length: ${prompt.length} characters`);
    console.log('  > Calling Claude 4 for transcript summarization...');

    // Generate summary using Claude 4
    const summary = await claude4.processText(prompt);

    console.log('   Phone transcript summarized successfully');
    console.log(`    - Summary length: ${summary.length} characters`);

    return {
      success: true,
      summary: summary.trim()
    };

  } catch (error) {
    console.error('L Error summarizing phone transcript:', error);

    // Return fallback summary on error
    const fallbackSummary = request.analysis?.call_summary_title ||
                           `Phone call${request.callDuration ? ` (${formatDuration(request.callDuration)})` : ''}`;

    return {
      success: false,
      summary: fallbackSummary,
      error: `Failed to summarize phone transcript: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Build the Claude 4 prompt for transcript summarization
 */
function buildTranscriptSummaryPrompt(request: SummarizePhoneTranscriptRequest): string {
  const systemContext = `You are summarizing a phone call transcript into a concise, readable conversation summary. Your goal is to create a natural dialogue summary that:

1. Captures the key points discussed in chronological order
2. Preserves important quotes or specific information exchanged
3. Shows the natural flow of conversation between customer and agent
4. Highlights any action items, commitments, or outcomes
5. Uses a conversational tone that reads naturally

Guidelines:
- Format as a narrative conversation summary (not a bulleted list)
- Keep it concise but comprehensive (150-250 words)
- Use "Customer" and "Agent" to refer to speakers
- Focus on substance, not filler words or small talk
- Maintain chronological flow`;

  // Format the transcript
  const formattedTranscript = formatTranscriptEntries(request.transcript);

  // Add ElevenLabs analysis if available
  let analysisContext = '';
  if (request.analysis) {
    const parts: string[] = [];
    if (request.analysis.call_summary_title) {
      parts.push(`Title: ${request.analysis.call_summary_title}`);
    }
    if (request.analysis.transcript_summary) {
      parts.push(`Summary: ${request.analysis.transcript_summary}`);
    }
    if (parts.length > 0) {
      analysisContext = `\n\nELEVENLABS ANALYSIS:\n${parts.join('\n')}\n`;
    }
  }

  // Build metadata context
  const metadataContext = [];
  if (request.direction) {
    metadataContext.push(`Direction: ${request.direction === 'inbound' ? 'Inbound (customer called in)' : 'Outbound (agent called customer)'}`);
  }
  if (request.callDuration) {
    metadataContext.push(`Duration: ${formatDuration(request.callDuration)}`);
  }

  const metadataString = metadataContext.length > 0
    ? `\n\nCALL METADATA:\n${metadataContext.join('\n')}\n`
    : '';

  const taskInstructions = `Please create a concise conversation summary that captures the key points and flow of this phone call. Write it as a natural narrative that someone reading the conversation history would find useful and easy to understand.

Return only the conversation summary, no additional commentary or formatting.`;

  return `${systemContext}

${metadataString}${analysisContext}
TRANSCRIPT:
${formattedTranscript}

${taskInstructions}`;
}

/**
 * Format transcript entries into readable dialogue
 */
function formatTranscriptEntries(transcript: any[]): string {
  if (!transcript || transcript.length === 0) {
    return 'No transcript available';
  }

  return transcript.map((entry) => {
    // Handle different transcript formats from ElevenLabs
    const speaker = entry.role || entry.speaker || 'Unknown';
    const text = entry.message || entry.text || entry.content || '';
    const timestamp = entry.time_in_call_secs || entry.timestamp;

    // Map ElevenLabs speaker roles to our labels
    let speakerLabel = speaker;
    if (speaker.toLowerCase() === 'agent' || speaker.toLowerCase() === 'assistant') {
      speakerLabel = 'Agent';
    } else if (speaker.toLowerCase() === 'user' || speaker.toLowerCase() === 'customer') {
      speakerLabel = 'Customer';
    }

    // Include timestamp if available (for context)
    const timestampStr = timestamp !== undefined ? `[${formatDuration(timestamp)}] ` : '';

    return `${timestampStr}${speakerLabel}: ${text}`;
  }).join('\n');
}

/**
 * Format duration in seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

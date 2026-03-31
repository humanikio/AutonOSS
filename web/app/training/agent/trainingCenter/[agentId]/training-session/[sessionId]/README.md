# Training Session Analysis Cycles

This feature provides real-time AI-powered analysis of training conversations with visual display of analysis cycles and improvement suggestions.

## Features

### ✅ Real-time Analysis Display
- **Live session metrics**: Message counts, RAG usage, document retrieval stats
- **Conversation context**: User/agent message breakdown, flow analysis
- **Quality scoring**: Response quality metrics based on conversation depth

### ✅ AI Analysis Cycles
- **Automatic triggering**: Analysis runs after every training message exchange
- **Cycle-by-cycle view**: Each analysis cycle gets its own expandable line
- **Detailed analysis**: Full AI analysis of conversation patterns and performance
- **Improvement suggestions**: AI-generated recommendations for:
  - System prompt changes
  - Agent settings adjustments
  - Knowledge base improvements
  - Tool configurations

### ✅ Interactive UI
- **Expandable cycles**: Click to expand/collapse detailed analysis
- **Visual indicators**: Icons show cycle status and suggestions availability
- **Real-time updates**: New cycles appear automatically via Firestore listeners
- **Terminal-style display**: Consistent with existing analysis panel aesthetic

## Data Structure

Analysis cycles are stored in Firestore at:
```
/tenants/{tenantId}/trainingSessions/{sessionId}/analysisCycles/{cycleId}
```

Each cycle contains:
- `analysis`: AI-generated conversation analysis
- `suggestions`: Improvement recommendations (optional)
- `conversationContext`: Message counts, RAG usage, etc.
- `cycleNumber`: Sequential cycle identifier
- `timestamp`: When analysis was performed

## Components

### `AnalysisCycles.tsx`
Main component that:
- Fetches analysis cycles from Firestore in real-time
- Displays cycles in expandable card format
- Shows analysis text and suggestions
- Handles loading and error states

### Updated `page.tsx`
Training session page now includes:
- Split layout: Live analysis (top) + AI cycles (bottom)
- Enhanced header with "Live + AI Cycles" indicator
- Proper scrollable sections

## Usage

The analysis cycles appear automatically as training conversations progress. Each cycle provides:

1. **Quick preview**: First 120 characters of analysis visible by default
2. **Full analysis**: Complete AI analysis when expanded
3. **Context data**: Message counts, RAG usage, processing stats
4. **Suggestions**: Color-coded improvement recommendations when available

## Future Enhancements

- [ ] Apply suggestions directly from UI
- [ ] Export analysis cycles to PDF/CSV
- [ ] Cycle comparison view
- [ ] Analysis trend charts
- [ ] Custom analysis triggers
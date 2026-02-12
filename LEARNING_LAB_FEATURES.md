# Learning Lab - Enhanced Visual Workflow Builder

## Overview
The Learning Lab now features a comprehensive visual programming interface where users can build analysis workflows by dragging and connecting nodes. This combines an intuitive tool palette with a powerful canvas-based workflow builder.

## Features Implemented

### 1. **Expanded Tool Palette**

#### Workflow Control (New!)
- **Start** - Begin your analysis workflow
- **End** - Complete your workflow
- Special styling with animated icons and enhanced borders

#### Input Tools
- **Stock Symbol** - Enter a stock ticker directly
- **Stock Selection** (New!) - Select symbols from your saved preferences

#### Technical Analysis (Enhanced)
- **RSI (14)** - Relative Strength Index momentum indicator
- **MACD** - Moving Average Convergence Divergence
- **Moving Averages** - 50-day and 200-day MAs
- **Price Action** (New!) - Candlestick pattern analysis
- **Volume Analysis** (New!) - Volume trends & anomalies

#### Fundamental Analysis (Enhanced)
- **P/E Ratio** - Price-to-Earnings valuation
- **Revenue Growth** - Revenue trend analysis
- **Profit Margins** - Gross, operating, net margins
- **Sector Comparison** (New!) - Compare vs sector performance

#### AI-Powered Analysis (New Category!)
- **News Search** - Fetch market & company news
- **Price Alert** - Set up price notifications
- **Data Insights** - AI-powered data analysis
- **Live Chart** - Real-time price charts
- **Analyst Agent** - AI-powered comprehensive analysis

### 2. **Visual Workflow Canvas**
- Drag-and-drop interface for building workflows
- Connect nodes to show data flow and dependencies
- Visual representation of analysis pipelines
- Interactive controls (zoom, pan, fit view)
- Animated connections between nodes
- Special styling for Start/End nodes with visual indicators

### 3. **Enhanced UI/UX**
- **Wider Sidebar** (280px) - More space for tool descriptions
- **Category-Colored Headers** - Each tool category has a distinct color
- **Improved Tool Cards** - Better hover effects, shadow on hover, scale animations
- **Icon Backgrounds** - Colored backgrounds matching category theme
- **Professional Layout** - Clean, modern design with proper spacing

### 4. **Starter Templates**

#### AI Research Workflow (New!)
A complete workflow showcasing the new tools:
```
Start → News Search → Stock Selection → Analyst Agent → End
```
Perfect for learning the new AI-powered tools!

#### Momentum Strategy
Technical analysis workflow for identifying strong momentum:
```
Stock Symbol → RSI/MACD → Volume/Moving Averages → Price Action
```

#### Value Investing
Fundamental analysis workflow:
```
Stock Symbol → P/E/Revenue/Margins → Sector Comparison/News → Price Action
```

#### Breakout Detection (Advanced)
Complex multi-factor analysis:
```
Stock Symbol → Price/Volume/RSI → Moving Avg/MACD → Sector/News
```

### 5. **Interactive Learning**
- Build workflows visually to understand data flow
- Connect tools to see how analysis stages work together
- Click "Learn" to generate personalized tutorials based on your workflow
- Quiz system to test understanding
- Real-world examples in tutorials

## Usage

### Building a Workflow
1. **Navigate** to the Learning Lab page (`/learning`)
2. **Drag tools** from the left sidebar onto the canvas
3. **Connect nodes** by dragging from the source handle (right) to target handle (left)
4. **Organize** your workflow using the canvas controls
5. **Learn** - Click the "Learn" button to get a personalized tutorial

### Best Practices
- Start with a **Start** node and end with an **End** node
- Use **Input** nodes as your data sources
- Add **Technical** or **Fundamental** analysis layers
- Complete with **Analysis** tools for final insights
- Try the templates first to understand common patterns

### Example Workflow
```
Start
  ↓
News Search (check latest market news)
  ↓
Stock Selection (pick stocks from watchlist)
  ↓
RSI (check momentum)
  ↓
Analyst Agent (comprehensive AI analysis)
  ↓
End
```

## Technical Implementation

### Components
- **LearningLab.tsx** - Main workflow builder with React Flow
- **AnalysisNode.tsx** - Custom node component with category styling
- **TutorialPanel.tsx** - AI-generated tutorials and quizzes
- **TemplateGallery.tsx** - Pre-built workflow templates

### Node Categories
```typescript
{
  Workflow: '#10b981' (green),
  Input: '#3b82f6' (blue),
  Technical: '#8b5cf6' (purple),
  Fundamental: '#ef4444' (red),
  Analysis: '#ec4899' (pink)
}
```

### Node Types
All nodes support:
- Color-coded by category
- Icon representation
- Draggable on canvas
- Connectable via handles
- Hover effects and animations

## Future Enhancements
- Real-time data integration with each node
- Export workflows as JSON
- Share workflows with community
- More AI-powered analysis tools
- Live execution of workflows with real data
- Portfolio integration
- Alert system integration

## Files Modified
1. `/src/components/learning/LearningLab.tsx` - Main component with expanded tools
2. `/src/components/learning/AnalysisNode.tsx` - Enhanced node styling
3. `/src/lib/mock-data.ts` - New template added

---

**Built with React Flow, Next.js, and Tailwind CSS**

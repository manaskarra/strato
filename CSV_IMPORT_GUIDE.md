# Portfolio CSV Import Guide

## Overview
The Portfolio tab now supports importing your holdings from CSV files, including those exported from platforms like yfaninca.

## How to Use

1. **Navigate to Portfolio Tab**
   - Click on "Portfolio" in the top navigation

2. **Open Import Dialog**
   - Click the "Import CSV" button next to the manual "Add Holding" form

3. **Upload Your CSV File**
   - Click the file upload area or drag and drop your CSV file
   - Only `.csv` files are accepted

4. **Review Parsed Data**
   - The dialog will show a preview of all holdings parsed from your CSV
   - Any validation errors will be displayed at the top

5. **Choose Import Mode**
   - **Replace All**: Removes all existing holdings and imports the new ones
   - **Append to Existing**: Adds the imported holdings to your current portfolio

## CSV Format

### Required Columns
- `symbol` - Stock ticker (e.g., AAPL, MSFT)
- `shares` - Number of shares owned
- `avgCost` - Average cost per share in dollars

### Optional Columns
- `name` - Company/security name (defaults to symbol if not provided)
- `sector` - Sector classification (defaults to "Technology")
- `assetType` - Type of asset: Stock, ETF, Bond, etc. (defaults to "Stock")
- `geography` - Geographic region: US, Asia, Europe, etc. (defaults to "US")
- `currentPrice` - Current market price (defaults to 10% above avgCost if not provided)

### Example CSV

```csv
symbol,shares,avgCost,name,sector,assetType,geography
AAPL,50,155.00,Apple Inc,Technology,Stock,US
MSFT,30,310.00,Microsoft Corp,Technology,Stock,US
GOOGL,15,125.00,Alphabet Inc,Technology,Stock,US
JPM,40,145.00,JPMorgan Chase,Financial Services,Stock,US
VTI,100,210.00,Vanguard Total Stock Market ETF,Diversified,ETF,US
BND,150,78.00,Vanguard Total Bond Market ETF,Fixed Income,ETF,US
```

### Sample File
A sample CSV file is included at the project root: `sample-portfolio.csv`

## Common Sectors
- Technology
- Healthcare
- Financial Services
- Consumer Goods
- Energy
- Materials
- Real Estate
- Utilities
- Fixed Income
- Diversified

## Common Asset Types
- Stock
- ETF
- Bond
- Option
- Crypto
- Cash

## Common Geographies
- US
- Asia
- Europe
- Emerging Markets
- Global

## Validation Rules

The import will validate:
1. All required fields (symbol, shares, avgCost) are present
2. `shares` and `avgCost` are valid positive numbers
3. `symbol` is not empty

Any rows with validation errors will be displayed in the dialog and skipped during import.

## After Import

After importing, the portfolio will automatically:
- Calculate portfolio weights for each holding
- Update all allocation charts (by sector, geography, asset type)
- Recalculate portfolio metrics (health score, concentration risk, etc.)
- Display all holdings in the holdings table

## Tips

1. **Test with Sample File**: Use the included `sample-portfolio.csv` to test the import feature
2. **Backup First**: If replacing all holdings, note down your current portfolio first
3. **Use Append Mode**: For adding new holdings without losing existing ones
4. **Check Preview**: Always review the parsed data before confirming import
5. **Export Format**: Most portfolio trackers export in CSV format - just ensure your columns match the required format

## Troubleshooting

**CSV Not Parsing?**
- Ensure the file is a valid CSV with comma-separated values
- Check that headers match the required column names
- Remove any extra formatting or formulas (export as plain CSV)

**Validation Errors?**
- Check that numeric fields contain valid numbers
- Ensure symbol column is not empty
- Verify shares and avgCost are positive values

**Missing Data?**
- Optional columns will use default values if not provided
- Current price is calculated as 10% above avgCost if not in CSV
- Ensure at least the 3 required columns are present

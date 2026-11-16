"""
Visualization: Plotly chart showing market momentum by cohort.
Apple-inspired dark theme with clickable listing links.
"""

import re
import plotly.graph_objects as go

from aggregate import load_all_snapshots, aggregate_by_cohort_and_date, flatten_for_charting
from cohorts import COHORT_DEFINITIONS

# Apple-inspired color palette on dark background
APPLE_COLORS = {
    "997.1_manual_carrera": "#5AC8FA",      # iOS Blue
    "997.1_manual_carrera_s": "#4CD964",    # iOS Green
    "997.1_manual_carrera_4s": "#FF9500",   # iOS Orange
    "997.2_manual_carrera": "#AF52DE",      # iOS Purple
    "997.2_manual_carrera_s": "#FF2D55",    # iOS Pink/Red
    "997.2_manual_carrera_4s": "#FFCC00",   # iOS Yellow
}

DISPLAY_NAMES = {
    "997.1_manual_carrera": "997.1 Carrera",
    "997.1_manual_carrera_s": "997.1 Carrera S",
    "997.1_manual_carrera_4s": "997.1 Carrera 4S",
    "997.2_manual_carrera": "997.2 Carrera",
    "997.2_manual_carrera_s": "997.2 Carrera S",
    "997.2_manual_carrera_4s": "997.2 Carrera 4S",
}


def create_momentum_chart(save_html: bool = True) -> go.Figure:
    """
    Create an Apple-inspired dark theme chart with clickable listing links.
    """
    listings = load_all_snapshots()
    
    if not listings:
        print("No data to chart. Run scraper first.")
        return None
    
    aggregated = aggregate_by_cohort_and_date(listings)
    chart_data = flatten_for_charting(aggregated)
    
    fig = go.Figure()
    
    # Collect all annotations for persistent labels
    annotations = []
    
    # Only show 997.2 cohorts
    target_cohorts = [c for c in COHORT_DEFINITIONS if "997.2" in c]
    
    # Add scatter points for individual listings
    for cohort_id in target_cohorts:
        cohort_points = [d for d in chart_data if d["cohort"] == cohort_id]
        
        if not cohort_points:
            continue
        
        color = APPLE_COLORS.get(cohort_id, "#FFFFFF")
        display_name = DISPLAY_NAMES.get(cohort_id, cohort_id)
        
        # Expand individual prices for scatter plot
        all_dates = []
        all_prices = []
        all_urls = []
        all_mileages = []
        all_years = []
        
        for point in cohort_points:
            for i, price in enumerate(point["prices"]):
                all_dates.append(point["date"])
                all_prices.append(price)
                if i < len(point["listings"]):
                    listing = point["listings"][i]
                    all_urls.append(listing.get("url", ""))
                    all_mileages.append(listing.get("mileage", 0))
                    # Extract year from URL or use date
                    url = listing.get("url", "")
                    year_match = re.search(r"/(\d{4})-porsche", url)
                    year = year_match.group(1) if year_match else "?"
                    all_years.append(year)
                else:
                    all_urls.append("")
                    all_mileages.append(0)
                    all_years.append("?")
        
        # Determine generation from cohort
        generation = "997.1" if "997.1" in cohort_id else "997.2"
        
        # Create persistent labels for each point
        for i, (date, price, year, mileage, url) in enumerate(zip(all_dates, all_prices, all_years, all_mileages, all_urls)):
            mileage_str = f"{mileage:,} mi" if mileage else ""
            label_text = (
                f"<b>{year} {generation}</b><br>"
                f"${price:,}<br>"
                f"{mileage_str}"
            )
            annotations.append(dict(
                x=date,
                y=price,
                text=label_text,
                showarrow=True,
                arrowhead=0,
                arrowsize=0.5,
                arrowwidth=1,
                arrowcolor=color,
                ax=80,
                ay=-50 - (i % 3) * 20,  # Stagger to avoid overlap
                font=dict(
                    family="SF Mono, Menlo, monospace",
                    size=10,
                    color="#F5F5F7",
                ),
                align="left",
                bgcolor="rgba(29, 29, 31, 0.95)",
                bordercolor=color,
                borderwidth=1,
                borderpad=6,
            ))
        
        # Add scatter trace with custom data for click handling
        fig.add_trace(go.Scatter(
            x=all_dates,
            y=all_prices,
            mode="markers",
            name=display_name,
            marker=dict(
                color=color,
                size=16,
                opacity=1,
                line=dict(color="#FFFFFF", width=2),
                symbol="circle",
            ),
            customdata=all_urls,
            hovertemplate="<b>Click to open listing</b><extra></extra>",
            legendgroup=cohort_id,
        ))
    
    # Add moving average trend lines for each cohort
    for cohort_id in target_cohorts:
        # Get all individual listings for this cohort
        cohort_listings = []
        for point in [d for d in chart_data if d["cohort"] == cohort_id]:
            for i, price in enumerate(point["prices"]):
                cohort_listings.append({
                    "date": point["date"],
                    "price": price
                })
        
        if len(cohort_listings) < 2:
            continue
        
        # Sort by date
        cohort_listings.sort(key=lambda x: x["date"])
        
        color = APPLE_COLORS.get(cohort_id, "#FFFFFF")
        display_name = DISPLAY_NAMES.get(cohort_id, cohort_id)
        
        # Compute cumulative moving average
        dates = []
        moving_avgs = []
        running_sum = 0
        
        for i, listing in enumerate(cohort_listings):
            running_sum += listing["price"]
            dates.append(listing["date"])
            moving_avgs.append(running_sum / (i + 1))
        
        # Add moving average line
        fig.add_trace(go.Scatter(
            x=dates,
            y=moving_avgs,
            mode="lines",
            name=f"{display_name} Avg",
            line=dict(color=color, width=3),
            opacity=0.8,
            hovertemplate=f"{display_name}<br>Moving Avg: $%{{y:,.0f}}<extra></extra>",
            legendgroup=cohort_id,
            showlegend=True,
        ))
    
    # Apple-inspired dark layout
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="#000000",
        plot_bgcolor="#000000",
        title=dict(
            text="<b>997 Market Momentum</b>",
            font=dict(
                family="SF Pro Display, -apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif",
                size=32,
                color="#FFFFFF",
            ),
            x=0.5,
            xanchor="center",
        ),
        xaxis=dict(
            title=dict(
                text="Auction Date",
                font=dict(
                    family="SF Pro Text, -apple-system, sans-serif",
                    size=14,
                    color="#86868B",
                ),
            ),
            tickfont=dict(
                family="SF Mono, Menlo, monospace",
                size=11,
                color="#86868B",
            ),
            tickformat="%b %d",
            tickangle=0,
            gridcolor="#1D1D1F",
            gridwidth=1,
            zeroline=False,
            showline=False,
        ),
        yaxis=dict(
            title=dict(
                text="Sale Price",
                font=dict(
                    family="SF Pro Text, -apple-system, sans-serif",
                    size=14,
                    color="#86868B",
                ),
            ),
            tickfont=dict(
                family="SF Mono, Menlo, monospace",
                size=11,
                color="#86868B",
            ),
            tickformat="$,.0f",
            gridcolor="#1D1D1F",
            gridwidth=1,
            zeroline=False,
            showline=False,
        ),
        legend=dict(
            title=dict(
                text="Cohort",
                font=dict(color="#86868B", size=12),
            ),
            font=dict(
                family="SF Pro Text, -apple-system, sans-serif",
                size=13,
                color="#F5F5F7",
            ),
            bgcolor="rgba(0,0,0,0)",
            borderwidth=0,
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="center",
            x=0.5,
            itemsizing="constant",
        ),
        hovermode="closest",
        hoverlabel=dict(
            bgcolor="#1D1D1F",
            bordercolor="#333333",
            font=dict(
                family="SF Pro Text, -apple-system, sans-serif",
                size=13,
                color="#F5F5F7",
            ),
        ),
        height=800,
        margin=dict(t=120, b=60, l=80, r=200),
        annotations=annotations,
    )
    
    # Add click handler JavaScript for opening URLs
    click_js = """
    <script>
    // Wait for Plotly to fully render
    setTimeout(function() {
        var plots = document.querySelectorAll('.js-plotly-plot');
        plots.forEach(function(plot) {
            plot.on('plotly_click', function(data) {
                if (data.points && data.points[0] && data.points[0].customdata) {
                    var url = data.points[0].customdata;
                    if (url && url.length > 0) {
                        window.open(url, '_blank');
                    }
                }
            });
        });
    }, 1000);
    </script>
    """
    
    if save_html:
        output_path = "momentum_chart.html"
        
        # Write HTML with custom styling and click handler
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>997 Market Momentum</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            background: #000000;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
            color: #F5F5F7;
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        .header {{
            text-align: center;
            padding: 40px 20px 20px;
        }}
        .header h1 {{
            font-size: 48px;
            font-weight: 600;
            letter-spacing: -0.02em;
            background: linear-gradient(180deg, #FFFFFF 0%, #86868B 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }}
        .header p {{
            color: #86868B;
            font-size: 17px;
            margin-top: 12px;
        }}
        .chart-container {{
            background: #000000;
            border-radius: 20px;
            padding: 20px;
            margin-top: 20px;
        }}
        .instructions {{
            text-align: center;
            padding: 20px;
            color: #86868B;
            font-size: 14px;
        }}
        .instructions span {{
            display: inline-block;
            padding: 8px 16px;
            background: #1D1D1F;
            border-radius: 20px;
            margin-top: 10px;
        }}
        .plotly-graph-div {{
            cursor: pointer;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>997 Market Momentum</h1>
            <p>Porsche 911 997.1 & 997.2 Manual Carrera Auction Prices</p>
        </div>
        <div class="chart-container">
            {fig.to_html(full_html=False, include_plotlyjs='cdn', config={'displayModeBar': False})}
        </div>
        <div class="instructions">
            <span>💡 Click any dot to view the listing</span>
        </div>
    </div>
    {click_js}
</body>
</html>"""
        
        with open(output_path, "w") as f:
            f.write(html_content)
        
        print(f"Chart saved to {output_path}")
    
    return fig


def create_listing_table(save_html: bool = True) -> str:
    """
    Create a table of all listings with clickable links.
    """
    listings = load_all_snapshots()
    
    if not listings:
        return ""
    
    # Sort by date, then price
    listings.sort(key=lambda x: (x.get("date", ""), -x.get("price", 0)))
    
    rows = []
    for listing in listings:
        cohort = listing.get("cohort", "")
        color = APPLE_COLORS.get(cohort, "#FFFFFF")
        display_name = DISPLAY_NAMES.get(cohort, cohort)
        price = listing.get("price", 0)
        mileage = listing.get("mileage", 0)
        date = listing.get("date", "")
        url = listing.get("url", "")
        
        mileage_str = f"{mileage:,}" if mileage else "—"
        
        rows.append(f"""
        <tr onclick="window.open('{url}', '_blank')" style="cursor: pointer;">
            <td><span class="cohort-badge" style="background: {color}20; color: {color};">{display_name}</span></td>
            <td class="price">${price:,}</td>
            <td class="mileage">{mileage_str}</td>
            <td class="date">{date}</td>
            <td class="link"><a href="{url}" target="_blank">View →</a></td>
        </tr>
        """)
    
    table_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>997 Listings</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            background: #000000;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
            color: #F5F5F7;
            min-height: 100vh;
            padding: 40px 20px;
        }}
        .container {{
            max-width: 1000px;
            margin: 0 auto;
        }}
        h1 {{
            font-size: 36px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 40px;
            letter-spacing: -0.02em;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        th {{
            text-align: left;
            padding: 16px;
            color: #86868B;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #1D1D1F;
        }}
        td {{
            padding: 16px;
            border-bottom: 1px solid #1D1D1F;
            font-size: 15px;
        }}
        tr:hover {{
            background: #1D1D1F;
        }}
        .cohort-badge {{
            display: inline-block;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
        }}
        .price {{
            font-family: 'SF Mono', Menlo, monospace;
            font-weight: 600;
            font-size: 16px;
        }}
        .mileage {{
            color: #86868B;
            font-family: 'SF Mono', Menlo, monospace;
        }}
        .date {{
            color: #86868B;
        }}
        .link a {{
            color: #0A84FF;
            text-decoration: none;
        }}
        .link a:hover {{
            text-decoration: underline;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>All Listings</h1>
        <table>
            <thead>
                <tr>
                    <th>Cohort</th>
                    <th>Price</th>
                    <th>Mileage</th>
                    <th>Date</th>
                    <th>Link</th>
                </tr>
            </thead>
            <tbody>
                {''.join(rows)}
            </tbody>
        </table>
    </div>
</body>
</html>"""
    
    if save_html:
        output_path = "listings.html"
        with open(output_path, "w") as f:
            f.write(table_html)
        print(f"Listings table saved to {output_path}")
    
    return table_html


def main():
    """Generate all visualizations."""
    print("Generating momentum chart...")
    fig = create_momentum_chart()
    
    print("\nGenerating listings table...")
    create_listing_table()
    
    if fig:
        print("\nDone! Open momentum_chart.html or listings.html in your browser.")


if __name__ == "__main__":
    main()

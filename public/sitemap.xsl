<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:html="http://www.w3.org/TR/REC-html40"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>XML Sitemap | LAKPDF</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style type="text/css">
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            background: #f8fafc;
            color: #1e293b;
            padding: 32px 16px;
            font-size: 14px;
            line-height: 1.5;
          }
          .container {
            max-width: 1100px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06);
            border: 1px solid #e2e8f0;
            overflow: hidden;
          }
          .header {
            padding: 32px 32px 24px 32px;
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #ffffff;
          }
          .brand {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
          }
          .brand span {
            color: #38bdf8;
          }
          .header h1 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .header p {
            color: #e0f2fe;
            font-size: 13.5px;
            max-width: 700px;
          }
          .stats-bar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            padding: 16px 32px;
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
            gap: 16px;
          }
          .stats-count {
            font-weight: 600;
            color: #334155;
          }
          .search-box {
            padding: 8px 14px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 13px;
            outline: none;
            width: 260px;
            transition: border-color 0.2s;
          }
          .search-box:focus {
            border-color: #0284c7;
            box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
          }
          .table-wrapper {
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          th {
            background: #f8fafc;
            color: #475569;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 12px 20px;
            border-bottom: 2px solid #e2e8f0;
          }
          td {
            padding: 12px 20px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
          }
          tr:hover td {
            background-color: #f8fafc;
          }
          a {
            color: #0284c7;
            text-decoration: none;
            font-weight: 500;
            word-break: break-all;
          }
          a:hover {
            text-decoration: underline;
            color: #0369a1;
          }
          .badge-prio {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            background: #e0f2fe;
            color: #0369a1;
          }
          .badge-freq {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            background: #f1f5f9;
            color: #475569;
          }
          .footer {
            padding: 20px 32px;
            text-align: center;
            font-size: 12.5px;
            color: #64748b;
            background: #ffffff;
            border-top: 1px solid #e2e8f0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">LAK<span>PDF</span></div>
            <h1>XML Sitemap Index</h1>
            <p>This sitemap is indexed by Google, Bing, and major search engines for rapid crawling. It contains all public tools, blog tutorials, exam utilities, and static pages on LAKPDF.</p>
          </div>
          <div class="stats-bar">
            <div class="stats-count">
              Total Indexed URLs: <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong>
            </div>
            <input type="text" id="sitemapFilter" class="search-box" placeholder="Filter URLs by keyword..." onkeyup="filterTable()" />
          </div>
          <div class="table-wrapper">
            <table id="sitemapTable">
              <thead>
                <tr>
                  <th style="width: 50px;">#</th>
                  <th>URL (Location)</th>
                  <th style="width: 100px;">Priority</th>
                  <th style="width: 120px;">Change Freq</th>
                  <th style="width: 140px;">Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td style="color: #94a3b8; font-size: 12px;"><xsl:value-of select="position()"/></td>
                    <td>
                      <xsl:variable name="itemURL">
                        <xsl:value-of select="sitemap:loc"/>
                      </xsl:variable>
                      <a href="{$itemURL}" target="_blank">
                        <xsl:value-of select="sitemap:loc"/>
                      </a>
                    </td>
                    <td>
                      <span class="badge-prio"><xsl:value-of select="sitemap:priority"/></span>
                    </td>
                    <td>
                      <span class="badge-freq"><xsl:value-of select="sitemap:changefreq"/></span>
                    </td>
                    <td style="color: #64748b; font-size: 12.5px;">
                      <xsl:value-of select="sitemap:lastmod"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
          <div class="footer">
            Generated automatically by LAKPDF Sitemap Engine · <a href="/">Back to LAKPDF Home</a> · <a href="/sitemap">View HTML Sitemap</a>
          </div>
        </div>
        <script type="text/javascript">
          function filterTable() {
            var input = document.getElementById("sitemapFilter");
            var filter = input.value.toLowerCase();
            var trs = document.getElementById("sitemapTable").getElementsByTagName("tr");
            for (var i = 1; i &lt; trs.length; i++) {
              var text = trs[i].textContent || trs[i].innerText;
              trs[i].style.display = text.toLowerCase().indexOf(filter) &gt; -1 ? "" : "none";
            }
          }
        </script>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>

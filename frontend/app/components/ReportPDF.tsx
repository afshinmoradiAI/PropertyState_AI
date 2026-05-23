'use client'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PropertyReport } from '../types/property'

const COLORS = {
  brand: '#6B3A1F',
  brandDark: '#2C1A0E',
  brandLight: '#C4956A',
  cream: '#F5EDE3',
  ink: '#1A0F07',
  muted: '#8B5E3C',
  border: '#E8D5B7',
  good: '#065F46',
  bad: '#991B1B',
  warn: '#92400E',
}

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 36, fontSize: 10, color: COLORS.ink, fontFamily: 'Helvetica' },
  header: { borderBottomWidth: 2, borderBottomColor: COLORS.brand, paddingBottom: 12, marginBottom: 18 },
  brand: { fontSize: 9, color: COLORS.muted, letterSpacing: 1.5 },
  title: { fontSize: 22, color: COLORS.brandDark, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  subtitle: { fontSize: 9, color: COLORS.muted, marginTop: 6 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 11, color: COLORS.brandDark, fontFamily: 'Helvetica-Bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 12, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: COLORS.cream },
  rowLabel: { color: COLORS.muted, fontSize: 9 },
  rowValue: { color: COLORS.ink, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  verdictBox: { backgroundColor: COLORS.cream, padding: 14, borderRadius: 6, borderLeftWidth: 4, borderLeftColor: COLORS.brand, marginBottom: 12 },
  verdictBadge: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: '#FFFFFF', backgroundColor: COLORS.brand, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' },
  verdictScore: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: COLORS.brandDark },
  flexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priceBlock: { flex: 1, marginHorizontal: 3, padding: 8, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFFFFF' },
  priceLabel: { fontSize: 7, color: COLORS.muted, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  priceValue: { fontSize: 12, color: COLORS.brandDark, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  priceHint: { fontSize: 7, color: COLORS.muted, marginTop: 2 },
  commentary: { fontSize: 9, color: COLORS.muted, lineHeight: 1.5, marginTop: 6, fontStyle: 'italic' },
  bulletList: { marginTop: 4 },
  bullet: { fontSize: 9, color: COLORS.ink, marginBottom: 2 },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, fontSize: 7, color: COLORS.muted, textAlign: 'center', borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 6 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  pill: { fontSize: 8, color: COLORS.brand, borderWidth: 1, borderColor: COLORS.brandLight, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4, marginBottom: 4 },
  twoCol: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
})

function fmt(n: number, d = 0) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: d, maximumFractionDigits: d })
}
function aud(n: number) { return '$' + fmt(Math.abs(n)) }
function pct(n: number) { return n.toFixed(2) + '%' }

interface Props { report: PropertyReport }

export default function ReportPDF({ report }: Props) {
  const { property: p, rental_yield: ry, cashflow: cf, roi, location_risk: lr, tax_depreciation: td, investment_potential: ip, negotiation: ng } = report
  const generated = new Date(report.generated_at).toLocaleString('en-AU')

  return (
    <Document
      title={`PropertyState AI — ${p.address}`}
      author="PropertyState AI"
      subject="Property Investment Analysis"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>PROPERTYSTATE AI · INVESTMENT REPORT</Text>
          <Text style={styles.title}>{p.address}</Text>
          <Text style={styles.subtitle}>
            {p.suburb}, {p.state} {p.postcode} · {p.property_type.toUpperCase()} · {p.bedrooms}bd / {p.bathrooms}ba / {p.car_spaces} car
          </Text>
          <Text style={styles.subtitle}>Generated {generated}</Text>
        </View>

        {/* Verdict */}
        <View style={styles.verdictBox}>
          <View style={styles.flexRow}>
            <View>
              <Text style={[styles.priceLabel, { marginBottom: 4 }]}>Investment Verdict</Text>
              <Text style={styles.verdictBadge}>{ip.verdict}</Text>
              <Text style={[styles.subtitle, { marginTop: 6 }]}>Confidence: {ip.confidence}</Text>
            </View>
            <View>
              <Text style={[styles.priceLabel, { textAlign: 'right' }]}>Score</Text>
              <Text style={styles.verdictScore}>{ip.overall_score}/10</Text>
            </View>
          </View>
          <Text style={[styles.commentary, { color: COLORS.ink, fontStyle: 'normal', marginTop: 10 }]}>{ip.recommendation}</Text>
        </View>

        {/* Strengths & Risks */}
        <View style={styles.twoCol}>
          <View style={[styles.card, styles.half]}>
            <Text style={[styles.sectionTitle, { color: COLORS.good }]}>Strengths</Text>
            {ip.key_strengths.map((s, i) => (<Text key={i} style={styles.bullet}>+ {s}</Text>))}
          </View>
          <View style={[styles.card, styles.half]}>
            <Text style={[styles.sectionTitle, { color: COLORS.bad }]}>Risks</Text>
            {ip.key_risks.map((r, i) => (<Text key={i} style={styles.bullet}>! {r}</Text>))}
          </View>
        </View>

        {/* Negotiation */}
        <Text style={styles.sectionTitle}>Negotiation Strategy</Text>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>Asking</Text>
              <Text style={styles.priceValue}>{aud(ng.asking_price)}</Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>Opening offer</Text>
              <Text style={styles.priceValue}>{aud(ng.suggested_opening_offer)}</Text>
              <Text style={styles.priceHint}>Start here</Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>Max offer</Text>
              <Text style={styles.priceValue}>{aud(ng.recommended_max_offer)}</Text>
              <Text style={styles.priceHint}>Fair value</Text>
            </View>
            <View style={[styles.priceBlock, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.priceLabel}>Walk away</Text>
              <Text style={[styles.priceValue, { color: COLORS.warn }]}>{aud(ng.walk_away_price)}</Text>
              <Text style={styles.priceHint}>Don&apos;t exceed</Text>
            </View>
          </View>
          <Text style={{ fontSize: 9, color: COLORS.good, marginBottom: 6 }}>
            Potential savings: up to {aud(ng.estimated_savings_potential)} below asking · Market: {ng.market_position.replace(/_/g, ' ')}
          </Text>
          <Text style={styles.priceLabel}>Levers</Text>
          <View style={styles.pillRow}>
            {ng.negotiation_levers.map((lv, i) => (<Text key={i} style={styles.pill}>{i + 1}. {lv}</Text>))}
          </View>
          <Text style={[styles.commentary, { color: COLORS.ink, fontStyle: 'normal' }]}>{ng.strategy}</Text>
        </View>
      </Page>

      {/* Page 2 — Financials */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>PROPERTYSTATE AI · FINANCIAL ANALYSIS</Text>
          <Text style={styles.title}>{p.address}</Text>
        </View>

        <Text style={styles.sectionTitle}>Rental Yield</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.rowLabel}>Gross Yield</Text><Text style={styles.rowValue}>{pct(ry.gross_yield_pct)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Net Yield</Text><Text style={styles.rowValue}>{pct(ry.net_yield_pct)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Annual Rental Income</Text><Text style={styles.rowValue}>{aud(ry.annual_rental_income)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Vacancy Rate</Text><Text style={styles.rowValue}>{pct(ry.estimated_vacancy_rate_pct)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Market Rent</Text><Text style={styles.rowValue}>{ry.market_rent_assessment.replace(/_/g, ' ')}</Text></View>
          <Text style={styles.commentary}>{ry.commentary}</Text>
        </View>

        <Text style={styles.sectionTitle}>Cashflow</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.rowLabel}>Weekly Rent</Text><Text style={styles.rowValue}>{aud(cf.weekly_rental_income)}/wk</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Mortgage Payment</Text><Text style={styles.rowValue}>{aud(cf.weekly_mortgage_payment)}/wk</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Expenses</Text><Text style={styles.rowValue}>{aud(cf.weekly_expenses)}/wk</Text></View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Net Cashflow</Text>
            <Text style={[styles.rowValue, { color: cf.is_positive_cashflow ? COLORS.good : COLORS.bad }]}>
              {cf.weekly_net_cashflow >= 0 ? '+' : '-'}{aud(cf.weekly_net_cashflow)}/wk
            </Text>
          </View>
          <View style={styles.row}><Text style={styles.rowLabel}>Annual Cashflow</Text><Text style={styles.rowValue}>{aud(cf.annual_net_cashflow)}/yr</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Break-even Rent</Text><Text style={styles.rowValue}>{aud(cf.break_even_rent)}/wk</Text></View>
          <Text style={styles.commentary}>{cf.commentary}</Text>
        </View>

        <Text style={styles.sectionTitle}>Return on Investment</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.rowLabel}>Capital Growth (pa)</Text><Text style={styles.rowValue}>{pct(roi.estimated_capital_growth_pct_pa)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Total Return (pa)</Text><Text style={styles.rowValue}>{pct(roi.total_return_pct_pa)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>5-Year Projected Value</Text><Text style={styles.rowValue}>{aud(roi.projected_value_5_years)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Equity in 5 Years</Text><Text style={styles.rowValue}>{aud(roi.equity_in_5_years)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Payback Period</Text><Text style={styles.rowValue}>{roi.payback_period_years ? `${roi.payback_period_years} yrs` : 'N/A'}</Text></View>
          <Text style={styles.commentary}>{roi.commentary}</Text>
        </View>

        <Text style={styles.footer}>PropertyState AI · Page 2 · For informational purposes only — not financial advice.</Text>
      </Page>

      {/* Page 3 — Location & Tax */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>PROPERTYSTATE AI · LOCATION &amp; TAX</Text>
          <Text style={styles.title}>{p.address}</Text>
        </View>

        <Text style={styles.sectionTitle}>Location &amp; Risk</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.rowLabel}>Suburb Score</Text><Text style={styles.rowValue}>{lr.suburb_score}/10</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Infrastructure</Text><Text style={styles.rowValue}>{lr.infrastructure_score}/10</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Flood Risk</Text><Text style={styles.rowValue}>{lr.flood_risk.toUpperCase()}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Crime Risk</Text><Text style={styles.rowValue}>{lr.crime_risk.toUpperCase()}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Vacancy Risk</Text><Text style={styles.rowValue}>{lr.vacancy_risk.toUpperCase()}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Demand/Supply</Text><Text style={styles.rowValue}>{lr.demand_supply_balance.replace(/_/g, ' ')}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Overall Risk</Text><Text style={styles.rowValue}>{lr.overall_risk_level.toUpperCase()}</Text></View>
          <Text style={[styles.priceLabel, { marginTop: 8 }]}>Key Drivers</Text>
          <View style={styles.bulletList}>
            {lr.key_drivers.map((d, i) => (<Text key={i} style={styles.bullet}>• {d}</Text>))}
          </View>
          <Text style={styles.commentary}>{lr.commentary}</Text>
        </View>

        <Text style={styles.sectionTitle}>Tax &amp; Depreciation</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.rowLabel}>Marginal Tax Rate (assumed)</Text><Text style={styles.rowValue}>{pct(td.marginal_tax_rate_pct)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Annual Depreciation</Text><Text style={styles.rowValue}>{aud(td.annual_depreciation_total)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>  Div 40 (plant &amp; equipment)</Text><Text style={styles.rowValue}>{aud(td.division_40_depreciation)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>  Div 43 (capital works)</Text><Text style={styles.rowValue}>{aud(td.division_43_depreciation)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Annual Deductible Loss</Text><Text style={styles.rowValue}>{aud(td.annual_tax_deductible_loss)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Est. Annual Tax Benefit</Text><Text style={styles.rowValue}>{aud(td.estimated_annual_tax_benefit)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>After-Tax Weekly Cashflow</Text><Text style={styles.rowValue}>{td.after_tax_weekly_cashflow >= 0 ? '+' : '-'}{aud(td.after_tax_weekly_cashflow)}/wk</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Gearing</Text><Text style={styles.rowValue}>{td.is_negatively_geared ? 'Negatively geared' : 'Positively geared'}</Text></View>
          <Text style={styles.commentary}>{td.commentary}</Text>
          <Text style={[styles.commentary, { color: COLORS.muted }]}>
            Estimates only — confirm with a quantity surveyor and accountant.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Property &amp; Loan Inputs</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.rowLabel}>Purchase Price</Text><Text style={styles.rowValue}>{aud(p.purchase_price)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Weekly Rent (est.)</Text><Text style={styles.rowValue}>{aud(p.estimated_rent_per_week)}/wk</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Loan Amount</Text><Text style={styles.rowValue}>{p.loan_amount ? aud(p.loan_amount) : `${aud(p.purchase_price * 0.8)} (80% LVR)`}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Interest Rate</Text><Text style={styles.rowValue}>{pct(p.interest_rate)}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Loan Term</Text><Text style={styles.rowValue}>{p.loan_term_years} years</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Build</Text><Text style={styles.rowValue}>{p.is_new_build ? 'New' : (p.year_built ? `Built ${p.year_built}` : 'Established')}</Text></View>
        </View>

        <Text style={styles.footer}>
          PropertyState AI · Page 3 · {report.tokens_used.toLocaleString()} AI tokens used · Generated {generated}
        </Text>
      </Page>
    </Document>
  )
}

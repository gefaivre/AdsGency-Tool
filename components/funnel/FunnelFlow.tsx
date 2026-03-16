"use client";

import { formatNumber } from "@/lib/utils";

interface Campaign {
  id: number;
  name: string;
  status: string;
  objective: string;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
}

interface FunnelFlowProps {
  campaigns: Campaign[];
}

// ─── Source logos ─────────────────────────────────────────────────────────────

function MetaIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"
        fill="#1877F2"
      />
    </svg>
  );
}

function PostHogIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#FF5C00" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="white"
        fontSize="9"
        fontWeight="800"
        fontFamily="monospace"
      >
        PH
      </text>
    </svg>
  );
}

function MetaBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 4 : 6,
        background: "#EFF4FF",
        border: "1px solid #C7D7FD",
        borderRadius: 999,
        padding: compact ? "3px 8px 3px 6px" : "4px 10px 4px 8px",
        whiteSpace: "nowrap" as const,
      }}
    >
      <MetaIcon size={compact ? 12 : 14} />
      <span
        style={{
          fontSize: compact ? 10 : 11,
          fontWeight: 600,
          color: "#1877F2",
          letterSpacing: "0.01em",
        }}
      >
        Meta Ads
      </span>
    </div>
  );
}

function PostHogBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 4 : 6,
        background: "#FFF3EE",
        border: "1px solid #FDBA8C",
        borderRadius: 999,
        padding: compact ? "3px 8px 3px 6px" : "4px 10px 4px 8px",
        whiteSpace: "nowrap" as const,
      }}
    >
      <PostHogIcon size={compact ? 12 : 14} />
      <span
        style={{
          fontSize: compact ? 10 : 11,
          fontWeight: 600,
          color: "#C73E00",
          letterSpacing: "0.01em",
        }}
      >
        PostHog
      </span>
    </div>
  );
}

// ─── Stage definitions ────────────────────────────────────────────────────────
// widthPct: visible bar width as % of container
// svgL / svgR: left/right x-positions in a 1000-unit SVG viewBox, used to draw
// the trapezoid connectors between stages.  Derived from: (1000 - widthPct*10)/2

const STAGES = [
  {
    id: "awareness",
    label: "Awareness",
    sublabel: "Notoriété",
    objectives: ["BRAND_AWARENESS"],
    color: "#3B82F6",
    colorLight: "#EFF6FF",
    colorMid: "#BFDBFE",
    metric: "impressions" as keyof Campaign,
    metricLabel: "Impressions",
    source: "meta" as const,
    widthPct: 100,
    svgL: 0,
    svgR: 1000,
  },
  {
    id: "consideration",
    label: "Consideration",
    sublabel: "Considération",
    objectives: ["TRAFFIC", "LEAD_GENERATION"],
    color: "#8B5CF6",
    colorLight: "#F5F3FF",
    colorMid: "#DDD6FE",
    metric: "reach" as keyof Campaign,
    metricLabel: "Reach",
    source: "meta" as const,
    widthPct: 72,
    svgL: 140,
    svgR: 860,
  },
  {
    id: "conversion",
    label: "Conversion",
    sublabel: "Conversion",
    objectives: ["CONVERSIONS"],
    color: "#10B981",
    colorLight: "#ECFDF5",
    colorMid: "#A7F3D0",
    metric: "clicks" as keyof Campaign,
    metricLabel: "Conversions",
    source: "posthog" as const,
    widthPct: 50,
    svgL: 250,
    svgR: 750,
  },
];

function rateColor(r: number) {
  if (r < 20) return "#EF4444";
  if (r < 50) return "#F59E0B";
  return "#10B981";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FunnelFlow({ campaigns }: FunnelFlowProps) {
  const stageData = STAGES.map((stage) => {
    const stageCampaigns = campaigns.filter((c) =>
      stage.objectives.includes(c.objective)
    );
    const total = stageCampaigns.reduce(
      (sum, c) => sum + (c[stage.metric] as number),
      0
    );
    const avgCtr =
      stageCampaigns.length > 0
        ? stageCampaigns.reduce((s, c) => s + c.ctr, 0) / stageCampaigns.length
        : 0;
    return { ...stage, stageCampaigns, total, avgCtr };
  });

  // Passage rate from previous stage
  const rates: (number | null)[] = stageData.map((stage, i) => {
    if (i === 0) return null;
    const prev = stageData[i - 1].total;
    return prev > 0 ? (stage.total / prev) * 100 : null;
  });

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 16,
        border: "1px solid #E2E8F0",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #F1F5F9",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FAFBFC",
          gap: 12,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "#0F172A",
              letterSpacing: "-0.02em",
            }}
          >
            Funnel Marketing
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94A3B8" }}>
            Entonnoir de conversion
          </p>
        </div>

        {/* Connected sources legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "#94A3B8",
              fontWeight: 500,
              whiteSpace: "nowrap" as const,
            }}
          >
            Sources connectées :
          </span>
          <MetaBadge />
          <PostHogBadge />
        </div>
      </div>

      {/* ── Funnel body ── */}
      <div style={{ padding: "32px 32px 28px" }}>
        {stageData.map((stage, i) => {
          const prev = i > 0 ? stageData[i - 1] : null;
          const rate = rates[i];

          return (
            <div key={stage.id}>
              {/* ── Trapezoid connector between stages ── */}
              {prev && (
                <div style={{ position: "relative", height: 52 }}>
                  <svg
                    viewBox="0 0 1000 52"
                    preserveAspectRatio="none"
                    style={{ width: "100%", height: 52, display: "block" }}
                  >
                    <defs>
                      <linearGradient
                        id={`fgrad-${i}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={prev.color}
                          stopOpacity="0.10"
                        />
                        <stop
                          offset="100%"
                          stopColor={stage.color}
                          stopOpacity="0.10"
                        />
                      </linearGradient>
                    </defs>
                    {/* Filled trapezoid */}
                    <polygon
                      points={`${prev.svgL},0 ${prev.svgR},0 ${stage.svgR},52 ${stage.svgL},52`}
                      fill={`url(#fgrad-${i})`}
                    />
                    {/* Subtle slanted side lines */}
                    <line
                      x1={prev.svgL} y1="0"
                      x2={stage.svgL} y2="52"
                      stroke={prev.color}
                      strokeOpacity="0.25"
                      strokeWidth="1.5"
                    />
                    <line
                      x1={prev.svgR} y1="0"
                      x2={stage.svgR} y2="52"
                      stroke={stage.color}
                      strokeOpacity="0.25"
                      strokeWidth="1.5"
                    />
                  </svg>

                  {/* Conversion rate pill centred over the connector */}
                  {rate !== null && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        background: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: 999,
                        padding: "3px 12px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                        whiteSpace: "nowrap" as const,
                        zIndex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: "#94A3B8",
                          fontWeight: 500,
                        }}
                      >
                        Passage :
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: rateColor(rate),
                          fontFamily: "monospace",
                        }}
                      >
                        {rate.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Stage bar ── */}
              <div
                style={{
                  width: `${stage.widthPct}%`,
                  marginLeft: "auto",
                  marginRight: "auto",
                  background: stage.colorLight,
                  border: `1.5px solid ${stage.colorMid}`,
                  borderLeft: `4px solid ${stage.color}`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  boxSizing: "border-box" as const,
                }}
              >
                {/* Left: stage label + campaign pills */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 8,
                      flexWrap: "wrap" as const,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: stage.color,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {stage.label}
                    </span>
                    <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>
                      {stage.sublabel}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        background: "#FFFFFF",
                        border: `1px solid ${stage.colorMid}`,
                        color: stage.color,
                        borderRadius: 99,
                        padding: "1px 7px",
                        fontWeight: 600,
                      }}
                    >
                      {stage.stageCampaigns.length} camp.
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                    {stage.stageCampaigns.length > 0 ? (
                      stage.stageCampaigns.map((c) => (
                        <span
                          key={c.id}
                          style={{
                            fontSize: 10,
                            background: "#FFFFFF",
                            border: `1px solid ${stage.colorMid}`,
                            borderRadius: 6,
                            padding: "3px 8px",
                            color: "#374151",
                            fontWeight: 500,
                            maxWidth: 160,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                          }}
                        >
                          {c.name}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 10, color: "#94A3B8" }}>
                        Aucune campagne active
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: metrics + source badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    flexShrink: 0,
                  }}
                >
                  {/* Primary metric */}
                  <div style={{ textAlign: "right" as const }}>
                    <p
                      style={{
                        margin: "0 0 2px",
                        fontSize: 9,
                        color: "#94A3B8",
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {stage.metricLabel}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 22,
                        fontWeight: 800,
                        color: "#0F172A",
                        fontFamily: "monospace",
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {formatNumber(stage.total)}
                    </p>
                  </div>

                  {/* CTR */}
                  {stage.avgCtr > 0 && (
                    <div style={{ textAlign: "right" as const }}>
                      <p
                        style={{
                          margin: "0 0 2px",
                          fontSize: 9,
                          color: "#94A3B8",
                          fontWeight: 700,
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.08em",
                        }}
                      >
                        CTR moy.
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 22,
                          fontWeight: 800,
                          color: stage.color,
                          fontFamily: "monospace",
                          lineHeight: 1,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {stage.avgCtr.toFixed(2)}%
                      </p>
                    </div>
                  )}

                  {/* Data source badge */}
                  {stage.source === "meta" ? (
                    <MetaBadge compact />
                  ) : (
                    <PostHogBadge compact />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Bottom summary ── */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 20,
            borderTop: "1px dashed #E2E8F0",
            display: "flex",
            justifyContent: "center",
            gap: 56,
          }}
        >
          {stageData.map((stage) => (
            <div key={`sum-${stage.id}`} style={{ textAlign: "center" as const }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: stage.color,
                  margin: "0 auto 6px",
                }}
              />
              <p
                style={{
                  margin: "0 0 3px",
                  fontSize: 9,
                  color: "#94A3B8",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                }}
              >
                {stage.label}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0F172A",
                  fontFamily: "monospace",
                  letterSpacing: "-0.02em",
                }}
              >
                {formatNumber(stage.total)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

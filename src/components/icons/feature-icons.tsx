import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

// Soma core: private thinking that publishes
export function ThinkingDigitalIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="4" width="12" height="16" rx="2" />
      <path d="M7 8h5M7 12h5M7 16h3" />
      <circle cx="17.5" cy="9" r="3.2" />
      <path d="M17.5 12.2V15l-1.5 2M17.5 15l1.5 2" />
    </Base>
  );
}

export function ReadingBookIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 6c-2-1.5-5-1.5-8 0v12c3-1.5 6-1.5 8 0 2-1.5 5-1.5 8 0V6c-3-1.5-6-1.5-8 0Z" />
      <path d="M12 6v12" />
    </Base>
  );
}

export function DeployPublishIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 17c2 0 2-1.5 4-1.5S10 17 12 17s2-1.5 4-1.5 2 1.5 4 1.5" />
      <path d="M12 15V4M12 4 7.5 8.5M12 4l4.5 4.5" />
    </Base>
  );
}

export function MarginAssistantIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="3" width="12" height="18" rx="2" />
      <path d="M8 8h4M8 12h4M8 16h2" />
      <circle cx="17" cy="17" r="4" />
      <path d="M15.5 17h.01M17 17h.01M18.5 17h.01" />
    </Base>
  );
}

export function PhysicalPrintIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 8V3h10v5" />
      <rect x="4" y="8" width="16" height="8" rx="2" />
      <path d="M7 13h10v7H7z" />
      <path d="M10 16.5h4" />
    </Base>
  );
}

export function NotebookLearnIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M12.5 8.5 14 7l3 3-1.5 1.5M12.5 8.5 13 10l-2 2" />
    </Base>
  );
}

export function AnnotationsHighlightIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="3" width="12" height="18" rx="2" />
      <path d="M8 8h4M8 12h4" />
      <path d="M13 17.5 19.5 11l-2-2L11 15.5l-1 3z" />
    </Base>
  );
}

export function PrivacyToggleIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="10" width="10" height="10" rx="2" />
      <circle cx="9" cy="15" r="1.6" />
      <path d="M9 13.4V14M14 7.5h4a2 2 0 0 1 0 4h-3M17 5.5 19 7.5l-2 2" />
    </Base>
  );
}

export function ContextDiscussionsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 5h12v7H9l-3 3v-3H4Z" />
      <path d="M16 11h4v6h-2v2l-2-2" />
    </Base>
  );
}

// Soma Labs: hands-on drills on your machine
export function LabsCompanionIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 3h6M10 3v5l-5 11a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19l-5-11V3" />
      <path d="M7.5 15h9" />
    </Base>
  );
}

export function EdgeSqliteIcon(props: IconProps) {
  return (
    <Base {...props}>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
      <path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13" />
      <path d="M12 10.5 13.5 14l-3.5.5 2.5 2.5" />
    </Base>
  );
}

export function CodeDrillsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="m9 9-2 2 2 2M15 9l2 2-2 2" />
      <path d="M7 20h10" />
    </Base>
  );
}

export function EdgeInfraIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="8" y="8" width="8" height="8" rx="1.5" />
      <path d="M12 8V4M12 20v-4M8 12H4M20 12h-4M6.5 6.5 5 5M19 19l-1.5-1.5M17.5 6.5 19 5M5 19l1.5-1.5" />
    </Base>
  );
}

export function AgentAutopilotIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="7" width="10" height="10" rx="2" />
      <circle cx="9" cy="12" r="2.2" />
      <path d="M14 4h6M14 8h4M16 16l4 4M18 16v4h-4" />
    </Base>
  );
}

// Son: voice proof
export function SpeakAgentIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 10v4M7.5 7.5v9M11 5v14" />
      <path d="M14 9h5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2l-2 2v-2" />
      <path d="M17.5 9.5v2" />
    </Base>
  );
}

export function VoiceQaIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="9" r="5" />
      <path d="M9 12.5v.01M9 9.5c.8 0 1.2-.5 1.2-1 0-.6-.6-1-1.2-1-.7 0-1.2.4-1.2 1H6" />
      <path d="M14 14.5c2 0 2-1 4-1s2 1 2 1M14 18c2 0 2-1 4-1s2 1 2 1" />
    </Base>
  );
}

export const featureIcons = {
  thinkingDigital: ThinkingDigitalIcon,
  readingBook: ReadingBookIcon,
  deployPublish: DeployPublishIcon,
  marginAssistant: MarginAssistantIcon,
  physicalPrint: PhysicalPrintIcon,
  notebookLearn: NotebookLearnIcon,
  annotationsHighlight: AnnotationsHighlightIcon,
  privacyToggle: PrivacyToggleIcon,
  contextDiscussions: ContextDiscussionsIcon,
  labsCompanion: LabsCompanionIcon,
  edgeSqlite: EdgeSqliteIcon,
  codeDrills: CodeDrillsIcon,
  edgeInfra: EdgeInfraIcon,
  agentAutopilot: AgentAutopilotIcon,
  speakAgent: SpeakAgentIcon,
  voiceQa: VoiceQaIcon,
} as const;

export type FeatureIconKey = keyof typeof featureIcons;

// Which icons ship with which publishable project.
export const projectIconGroups: Record<string, FeatureIconKey[]> = {
  soma: [
    "thinkingDigital",
    "readingBook",
    "deployPublish",
    "marginAssistant",
    "physicalPrint",
    "notebookLearn",
    "annotationsHighlight",
    "privacyToggle",
    "contextDiscussions",
  ],
  "soma-labs": ["labsCompanion", "edgeSqlite", "codeDrills", "edgeInfra", "agentAutopilot"],
  son: ["speakAgent", "voiceQa"],
};

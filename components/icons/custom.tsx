import type { SVGProps } from "react";

/**
 * Icons Phosphor has no meaningful symbol for, drawn on Phosphor's 256-unit grid with the same
 * 16-unit stroke, round joins and duotone fill (20 % opacity), so they sit naturally beside them.
 */
type Props = { size?: number; weight?: "regular" | "duotone" } & Omit<SVGProps<SVGSVGElement>, "fill" | "children">;

function Base({ size = 20, weight = "regular", children, ...rest }: Props & { children: (duo: boolean) => React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {children(weight === "duotone")}
    </svg>
  );
}
const duoFill = { fill: "currentColor", stroke: "none", opacity: 0.2 } as const;

/** Sign-off: a pen nib finishing a signature line, with an approval tick. */
export function SignOffIcon(props: Props) {
  return (
    <Base {...props}>
      {(duo) => (
        <>
          {duo && <path d="M152 40l48 48-72 72H80v-48z" {...duoFill} />}
          <path d="M152 40l48 48-72 72H80v-48z" />
          <path d="M128 64l48 48" />
          <path d="M32 208c24-24 40-24 56 0s32 24 56 0" />
          <path d="M176 200l16 16 32-40" />
        </>
      )}
    </Base>
  );
}

/** Change order: a document whose lines shift — one struck out, one added (± marks). */
export function ChangeOrderIcon(props: Props) {
  return (
    <Base {...props}>
      {(duo) => (
        <>
          {duo && <path d="M56 32h104l48 48v144H56z" {...duoFill} />}
          <path d="M56 32h104l48 48v144H56z" />
          <path d="M160 32v48h48" />
          <path d="M88 120h40" />
          <path d="M88 152h40" opacity=".55" />
          <path d="M84 156l48-8" />
          <path d="M160 120v32M144 136h32" />
          <path d="M144 184h32" />
        </>
      )}
    </Base>
  );
}

/** Milestone: a flag planted on a rising, stepped ground line — progress reached. */
export function MilestoneIcon(props: Props) {
  return (
    <Base {...props}>
      {(duo) => (
        <>
          {duo && <path d="M96 40h96l-24 32 24 32H96z" {...duoFill} />}
          <path d="M96 216V40h96l-24 32 24 32H96" />
          <path d="M24 216h40v-24h40v24h56v-40h72" />
        </>
      )}
    </Base>
  );
}

/** Site photo: a camera framing a crane — progress pictures from the building site. */
export function SitePhotoIcon(props: Props) {
  return (
    <Base {...props}>
      {(duo) => (
        <>
          {duo && <rect x="24" y="72" width="208" height="144" rx="16" {...duoFill} />}
          <path d="M24 88a16 16 0 0116-16h32l16-32h80l16 32h32a16 16 0 0116 16v112a16 16 0 01-16 16H40a16 16 0 01-16-16z" />
          <path d="M104 192v-72h56M104 120l-24 16M160 120v20" />
          <path d="M152 156h16" />
          <path d="M88 192h40" />
        </>
      )}
    </Base>
  );
}

/** Storage: stacked layers inside a gauge — how much of the personal space is used. */
export function StorageIcon(props: Props) {
  return (
    <Base {...props}>
      {(duo) => (
        <>
          {duo && <path d="M128 48l96 48-96 48-96-48z" {...duoFill} />}
          <path d="M128 48l96 48-96 48-96-48z" />
          <path d="M32 136l96 48 96-48" />
          <path d="M32 176l96 48 96-48" />
        </>
      )}
    </Base>
  );
}

/** Drawing file: a rolled plan with a measured line — DWG, DXF, IFC, SketchUp. */
export function DrawingFileIcon(props: Props) {
  return (
    <Base {...props}>
      {(duo) => (
        <>
          {duo && <path d="M56 32h104l48 48v144H56z" {...duoFill} />}
          <path d="M56 32h104l48 48v144H56z" />
          <path d="M160 32v48h48" />
          <path d="M88 184V120h64v64z" />
          <path d="M88 152h32v32" />
          <path d="M80 208h88M80 200v16M168 200v16" />
        </>
      )}
    </Base>
  );
}

/** Quote revisions: stacked documents, the front one numbered — how a price moved over time. */
export function RevisionsIcon(props: Props) {
  return (
    <Base {...props}>
      {(duo) => (
        <>
          {duo && <rect x="72" y="56" width="128" height="168" rx="8" {...duoFill} />}
          <rect x="72" y="56" width="128" height="168" rx="8" />
          <path d="M48 192V40a8 8 0 018-8h112" />
          <path d="M104 104h64M104 136h64" />
          <path d="M112 176h20a12 12 0 000-24h-20v40" />
          <path d="M136 176l12 16" />
        </>
      )}
    </Base>
  );
}

/** Estimate: a house outline over a ruler — a price range from size and finish. */
export function EstimateIcon(props: Props) {
  return (
    <Base {...props}>
      {(duo) => (
        <>
          {duo && <path d="M48 112l80-64 80 64v64H48z" {...duoFill} />}
          <path d="M48 176v-64l80-64 80 64v64" />
          <path d="M104 176v-40h48v40" />
          <path d="M24 208h208M24 196v24M232 196v24M76 202v12M128 198v20M180 202v12" />
        </>
      )}
    </Base>
  );
}

/** Voice note: a waveform inside a speech bubble. */
export function VoiceNoteIcon(props: Props) {
  return (
    <Base {...props}>
      {(duo) => (
        <>
          {duo && <path d="M40 48h176a8 8 0 018 8v120a8 8 0 01-8 8H96l-40 32v-32H40a8 8 0 01-8-8V56a8 8 0 018-8z" {...duoFill} />}
          <path d="M40 48h176a8 8 0 018 8v120a8 8 0 01-8 8H96l-40 32v-32H40a8 8 0 01-8-8V56a8 8 0 018-8z" />
          <path d="M80 104v24M104 88v56M128 100v32M152 80v72M176 104v24" />
        </>
      )}
    </Base>
  );
}

/** Internal note: a note with a closed eye — visible to the team only. */
export function InternalNoteIcon(props: Props) {
  return (
    <Base {...props}>
      {(duo) => (
        <>
          {duo && <path d="M48 40h160v128l-48 48H48z" {...duoFill} />}
          <path d="M208 160V48a8 8 0 00-8-8H56a8 8 0 00-8 8v160a8 8 0 008 8h104z" />
          <path d="M160 216v-56h48" />
          <path d="M80 104c24 24 72 24 96 0M96 120l-8 16M128 126v16M160 120l8 16" />
        </>
      )}
    </Base>
  );
}

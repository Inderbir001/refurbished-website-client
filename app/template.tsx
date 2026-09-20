// A template (unlike a layout) remounts on every navigation, so each page gently fades in.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}

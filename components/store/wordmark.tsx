import { brand } from "@/lib/brand";

export function Wordmark() {
  return <><span className="wm-a">{brand.wordmark.first}</span><i className="wm-amp">&amp;</i><span className="wm-b">{brand.wordmark.second}</span></>;
}

export type Platform =
  | "x"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "threads";

const platformHosts: Array<{ platform: Platform; hosts: string[] }> = [
  { platform: "x", hosts: ["x.com", "twitter.com", "mobile.twitter.com"] },
  { platform: "instagram", hosts: ["instagram.com", "www.instagram.com"] },
  {
    platform: "facebook",
    hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"],
  },
  { platform: "tiktok", hosts: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"] },
  {
    platform: "youtube",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com"],
  },
  { platform: "threads", hosts: ["threads.net", "www.threads.net", "threads.com", "www.threads.com"] },
];

export function detectPlatform(value: string): Platform | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    const entry = platformHosts.find(({ hosts }) => hosts.includes(url.hostname.toLowerCase()));
    return entry?.platform ?? null;
  } catch {
    return null;
  }
}

export const platformNames: Record<Platform, string> = {
  x: "X / Twitter",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  threads: "Threads",
};

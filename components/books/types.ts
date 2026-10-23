export interface LawBook {
  id: string;
  codeId: string;
  titleFallback?: string;
  titleKey?: string;
  icon: string;
  category: "criminal" | "civil" | "procedure" | "special";
  color: string;
}

export type BookVersionSummary = {
  icon: "cloud-download-outline" | "git-branch-outline";
  label: string;
  meta: string;
  tint: string;
};

export type LanguageSourceBadge = {
  color: string;
  label: string;
};

export type DownloadLanguageOption = {
  isInstalled: boolean;
  isSelected: boolean;
  language: string;
  sizeLabel: string;
  sourceBadge: LanguageSourceBadge;
  versionId: string;
};

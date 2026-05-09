// Shared CMS types — keep parity with migration 006_cms_schema.sql

export type SiteSetting<T = unknown> = {
  key: string;
  value: T;
  updated_at: string;
};

export type TrustedBusiness = {
  id: string;
  name: string;
  city: string | null;
  industry: string | null;
  logo_url: string | null;
  logo_public_id: string | null;
  display_order: number;
  published: boolean;
  created_at: string;
};

export type ProjectStatus = "Live" | "Coming Soon" | "In Progress";
export type Project = {
  id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  result: string;
  image_url: string | null;
  image_public_id: string | null;
  live_url: string | null;
  status: ProjectStatus;
  year: string;
  featured: boolean;
  homepage_span: string;
  projects_span: string;
  display_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type TestimonialType = "text" | "screenshot" | "video";
export type Testimonial = {
  id: string;
  type: TestimonialType;
  author_name: string;
  author_handle: string | null;
  author_avatar_url: string | null;
  author_avatar_public_id: string | null;
  quote: string | null;
  screenshot_url: string | null;
  screenshot_public_id: string | null;
  video_url: string | null;
  video_public_id: string | null;
  video_poster_url: string | null;
  video_duration_s: number | null;
  link: string | null;
  display_order: number;
  published: boolean;
  created_at: string;
};

export type Service = {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  icon_name: string | null;
  features: string[];
  display_order: number;
  published: boolean;
};

export type PricePeriod = "one-time" | "monthly" | "starting-at";
export type PricingPlan = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  price_inr: number | null;
  price_period: PricePeriod;
  cta_label: string;
  cta_url: string;
  features: string[];
  highlighted: boolean;
  display_order: number;
  published: boolean;
  updated_at: string;
};

export type MediaAsset = {
  id: string;
  public_id: string;
  url: string;
  resource_type: "image" | "video";
  format: string | null;
  width: number | null;
  height: number | null;
  duration_s: number | null;
  bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

// Convenience: settings keys that the app reads
export type HeroLaunches = { count: number; label: string };
export type CtaConfig = { label: string; url: string };

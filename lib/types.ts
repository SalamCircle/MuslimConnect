export type CommunityCategory =
  | 'students' | 'business' | 'reverts' | 'technology'
  | 'parenting' | 'islamic_studies' | 'brothers' | 'sisters' | 'youth'
  | 'professionals' | 'general';

export type LocationScope = 'area' | 'city' | 'region' | 'uk' | 'global';
export type Gender = 'male' | 'female' | 'prefer_not_to_say';
export type MemberRole = 'member' | 'moderator' | 'admin';
export type NewsCategory = 'uk' | 'world' | 'local' | 'community' | 'general';
export type ResourceCategory = 'quran' | 'hadith' | 'duas' | 'articles' | 'learning' | 'islamic_finance';
export type UserRole = 'admin' | 'moderator' | 'user';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  username: string | null;
  gender: Gender;
  date_of_birth: string | null;
  country: string;
  region: string | null;
  city: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  is_online: boolean;
  is_admin: boolean;
  is_moderator: boolean;
  is_suspended: boolean;
  is_banned: boolean;
  role: UserRole;
  followers_count: number;
  following_count: number;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Community {
  id: string;
  name: string;
  description: string | null;
  category: CommunityCategory;
  icon_url: string | null;
  banner_url: string | null;
  creator_id: string | null;
  member_count: number;
  post_count: number;
  is_public: boolean;
  slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  community_id: string | null;
  title: string | null;
  content: string;
  image_url: string | null;
  location_scope: LocationScope;
  country: string | null;
  region: string | null;
  city: string | null;
  postcode: string | null;
  like_count: number;
  comment_count: number;
  save_count: number;
  share_count: number;
  slug: string | null;
  is_featured: boolean;
  is_approved: boolean;
  status: 'active' | 'hidden' | 'removed';
  created_at: string;
  updated_at: string;
}

export interface PostWithAuthor extends Post {
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'city' | 'region' | 'username'> | null;
  communities: Pick<Community, 'id' | 'name' | 'category' | 'slug'> | null;
}

export interface UserFollow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
}

export interface CommentWithAuthor extends Comment {
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
}

export interface PostSave {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant_a_id: string;
  participant_b_id: string;
  last_message: string | null;
  last_message_at: string;
  unread_count_a: number;
  unread_count_b: number;
  created_at: string;
}

export interface ConversationWithOther extends Conversation {
  other: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'is_online'> | null;
  unread_for_me: number;
}

export interface News {
  id: string;
  author_id: string | null;
  title: string;
  excerpt: string | null;
  content: string;
  category: NewsCategory;
  image_url: string | null;
  is_featured: boolean;
  published_at: string;
  created_at: string;
}

export interface Mosque {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  created_at: string;
}

export interface Resource {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: ResourceCategory;
  url: string | null;
  content: string | null;
  tags: string[];
  is_featured: boolean;
  created_at: string;
}

export interface Business {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  category: string;
  address: string | null;
  region: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  image_url: string | null;
  is_sponsored: boolean;
  is_verified: boolean;
  created_at: string;
}

export type JobCategory = 'technology' | 'finance' | 'education' | 'healthcare' | 'charity' | 'retail' | 'hospitality' | 'construction' | 'creative' | 'other';
export type JobType = 'full_time' | 'part_time' | 'remote' | 'contract' | 'volunteer';
export type EventCategory = 'mosque_event' | 'conference' | 'youth_program' | 'charity_event' | 'general' | 'education' | 'charity' | 'networking' | 'social' | 'religious' | 'sports' | 'arts' | 'other';

export interface Job {
  id: string;
  title: string;
  employer: string;
  location: string | null;
  city: string | null;
  region: string | null;
  description: string | null;
  category: JobCategory;
  job_type: JobType;
  salary_range: string | null;
  apply_url: string | null;
  is_featured: boolean;
  is_approved: boolean;
  status: 'pending' | 'approved' | 'rejected';
  posted_by: string | null;
  closing_date: string | null;
  is_employer_verified: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  creator_id: string | null;
  community_id: string | null;
  title: string;
  description: string | null;
  category: EventCategory;
  start_datetime: string;
  end_datetime: string | null;
  venue_name: string | null;
  address: string | null;
  region: string | null;
  city: string | null;
  postcode: string | null;
  is_online: boolean;
  image_url: string | null;
  attendee_count: number;
  is_featured: boolean;
  is_approved: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Advertisement {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  placement_slot: string;
  target_scope: string | null;
  target_city: string | null;
  target_region: string | null;
  active_from: string | null;
  active_to: string | null;
  is_active: boolean;
  created_at: string;
}

export type ReportReason = 'spam' | 'harassment' | 'offensive' | 'misinformation' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';
export type ReportContentType = 'post' | 'comment' | 'user' | 'group' | 'job' | 'event';

export interface Report {
  id: string;
  reporter_id: string | null;
  content_type: ReportContentType;
  content_id: string;
  reason: ReportReason;
  notes: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type NotificationType =
  | 'comment' | 'like' | 'reply' | 'group_request_accepted'
  | 'event_approved' | 'job_approved' | 'mention' | 'report_actioned';

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  content_type: 'post' | 'comment' | 'event' | 'job' | 'group';
  content_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  source_name: string | null;
  source_url: string | null;
  image_url: string | null;
  published_at: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

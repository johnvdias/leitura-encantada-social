// User and Profile types
export interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  reading_goal: number | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  created_at?: string;
}

// Book types
export interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  pages: number | null;
  genre: string;
  reading_status: "reading" | "completed" | "want_to_read";
  reading_progress: number;
  description: string;
  current_page?: number;
  last_read_at?: string;
  rating?: number;
  personal_notes?: string;
  tags?: string[];
  isbn?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Friendship types
export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
  requester?: Profile;
  addressee?: Profile;
}

// Achievement types
export interface Achievement {
  id: string;
  user_id: string;
  achievement_name: string;
  description: string;
  earned_at: string;
  achievement_type: string;
}

// Post types
export interface Post {
  id: string;
  user_id: string;
  content: string;
  book_id?: string;
  post_type: "status" | "review" | "recommendation" | "progress";
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  books?: Book;
  likes_count?: number;
  comments_count?: number;
  user_has_liked?: boolean;
}

// Club types
export interface Club {
  id: string;
  name: string;
  description: string;
  cover_image: string | null;
  is_private: boolean;
  creator_id: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  is_member?: boolean;
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  type:
    | "friend_request"
    | "friend_accepted"
    | "club_invitation"
    | "new_post"
    | "achievement";
  title: string;
  content: string;
  is_read: boolean;
  related_id?: string;
  created_at: string;
}

// Reading History types
export interface ReadingHistory {
  id: string;
  user_id: string;
  book_id: string;
  pages_read: number;
  previous_progress: number;
  new_progress: number;
  created_at: string;
  books?: Book;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: any;
}

// Search types
export interface SearchResult {
  users: Profile[];
  books: Book[];
  clubs: Club[];
}

// Form types
export interface ProfileUpdateData {
  display_name: string;
  bio: string;
  avatar_url: string;
}

export interface BookSearchResult {
  id: string;
  title: string;
  author: string;
  description: string;
  pages: number | null;
  genre: string;
  cover_url: string | null;
  isbn: string | null;
}

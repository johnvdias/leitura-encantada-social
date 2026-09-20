export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          description: string | null
          earned_at: string
          emoji: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          description?: string | null
          earned_at?: string
          emoji?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          description?: string | null
          earned_at?: string
          emoji?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      book_catalog: {
        Row: {
          authors: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          genre: string | null
          google_books_id: string | null
          id: string
          isbn_10: string | null
          isbn_13: string | null
          language: string | null
          open_library_id: string | null
          page_count: number | null
          published_date: string | null
          publisher: string | null
          source: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          authors?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          genre?: string | null
          google_books_id?: string | null
          id?: string
          isbn_10?: string | null
          isbn_13?: string | null
          language?: string | null
          open_library_id?: string | null
          page_count?: number | null
          published_date?: string | null
          publisher?: string | null
          source?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          authors?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          genre?: string | null
          google_books_id?: string | null
          id?: string
          isbn_10?: string | null
          isbn_13?: string | null
          language?: string | null
          open_library_id?: string | null
          page_count?: number | null
          published_date?: string | null
          publisher?: string | null
          source?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      book_loans: {
        Row: {
          book_author: string | null
          book_cover_url: string | null
          book_id: string
          book_title: string | null
          borrower_id: string
          created_at: string
          id: string
          message: string | null
          owner_id: string
          requested_at: string
          responded_at: string | null
          returned_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          book_author?: string | null
          book_cover_url?: string | null
          book_id: string
          book_title?: string | null
          borrower_id: string
          created_at?: string
          id?: string
          message?: string | null
          owner_id?: string
          requested_at?: string
          responded_at?: string | null
          returned_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          book_author?: string | null
          book_cover_url?: string | null
          book_id?: string
          book_title?: string | null
          borrower_id?: string
          created_at?: string
          id?: string
          message?: string | null
          owner_id?: string
          requested_at?: string
          responded_at?: string | null
          returned_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_loans_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          }
        ]
      }
      book_search_cache: {
        Row: {
          created_at: string
          expires_at: string
          external_id: string | null
          id: string
          isbn: string | null
          normalized_query: string | null
          provider: string
          response_data: Json
          search_query: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          external_id?: string | null
          id?: string
          isbn?: string | null
          normalized_query?: string | null
          provider: string
          response_data: Json
          search_query: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          external_id?: string | null
          id?: string
          isbn?: string | null
          normalized_query?: string | null
          provider?: string
          response_data?: Json
          search_query?: string
          updated_at?: string
        }
        Relationships: []
      }
      book_search_log: {
        Row: {
          created_at: string
          id: string
          query: string
          resolved_by: string
          search_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          resolved_by: string
          search_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          resolved_by?: string
          search_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string | null
          cover_url: string | null
          created_at: string
          current_page: number | null
          description: string | null
          genre: string | null
          id: string
          last_read_at: string | null
          pages: number | null
          personal_notes: string | null
          rating: number | null
          reading_progress: number
          reading_status: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          current_page?: number | null
          description?: string | null
          genre?: string | null
          id?: string
          last_read_at?: string | null
          pages?: number | null
          personal_notes?: string | null
          rating?: number | null
          reading_progress?: number
          reading_status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          current_page?: number | null
          description?: string | null
          genre?: string | null
          id?: string
          last_read_at?: string | null
          pages?: number | null
          personal_notes?: string | null
          rating?: number | null
          reading_progress?: number
          reading_status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          joined_at: string | null
          progress: number
          status: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          joined_at?: string | null
          progress?: number
          status?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          joined_at?: string | null
          progress?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      challenges: {
        Row: {
          book_id: string | null
          created_at: string
          creator_id: string | null
          description: string | null
          end_date: string
          goal_type: string
          goal_value: number
          id: string
          name: string
          start_date: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          end_date: string
          goal_type: string
          goal_value: number
          id?: string
          name: string
          start_date: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          end_date?: string
          goal_type?: string
          goal_value?: number
          id?: string
          name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      club_discussions: {
        Row: {
          club_id: string
          content: string
          created_at: string
          id: string
          is_announcement: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          content: string
          created_at?: string
          id?: string
          is_announcement?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          content?: string
          created_at?: string
          id?: string
          is_announcement?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_discussions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      club_reading_schedules: {
        Row: {
          book_id: string | null
          club_id: string | null
          created_at: string
          creator_id: string | null
          end_date: string
          id: string
          name: string
          reading_goal: Json | null
          start_date: string
        }
        Insert: {
          book_id?: string | null
          club_id?: string | null
          created_at?: string
          creator_id?: string | null
          end_date: string
          id?: string
          name: string
          reading_goal?: Json | null
          start_date: string
        }
        Update: {
          book_id?: string | null
          club_id?: string | null
          created_at?: string
          creator_id?: string | null
          end_date?: string
          id?: string
          name?: string
          reading_goal?: Json | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_reading_schedules_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_reading_schedules_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_reading_schedules_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      club_schedule_participants: {
        Row: {
          club_schedule_id: string
          joined_at: string
          progress: number
          user_id: string
        }
        Insert: {
          club_schedule_id: string
          joined_at?: string
          progress?: number
          user_id: string
        }
        Update: {
          club_schedule_id?: string
          joined_at?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_schedule_participants_club_schedule_id_fkey"
            columns: ["club_schedule_id"]
            isOneToOne: false
            referencedRelation: "club_reading_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_schedule_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          creator_id: string
          current_book_id: string | null
          description: string | null
          id: string
          invite_code: string | null
          is_private: boolean
          max_members: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          current_book_id?: string | null
          description?: string | null
          id?: string
          invite_code?: string | null
          is_private?: boolean
          max_members?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          current_book_id?: string | null
          description?: string | null
          id?: string
          invite_code?: string | null
          is_private?: boolean
          max_members?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_current_book_id_fkey"
            columns: ["current_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_reading_schedules: {
        Row: {
          book_id: string | null
          created_at: string
          creator_id: string | null
          end_date: string
          id: string
          name: string
          reading_goal: Json | null
          start_date: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          creator_id?: string | null
          end_date: string
          id?: string
          name: string
          reading_goal?: Json | null
          start_date: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          creator_id?: string | null
          end_date?: string
          id?: string
          name?: string
          reading_goal?: Json | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_reading_schedules_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_reading_schedules_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_read: boolean
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nudges: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          receiver_id: string | null
          sender_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          receiver_id?: string | null
          sender_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          receiver_id?: string | null
          sender_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nudges_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "nudges_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          book_id: string | null
          content: string
          created_at: string
          id: string
          post_type: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          book_id?: string | null
          content: string
          created_at?: string
          id?: string
          post_type?: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          book_id?: string | null
          content?: string
          created_at?: string
          id?: string
          post_type?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_posts_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          annual_books_goal: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          notification_preferences: Json
          reading_goal: number | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          annual_books_goal?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          notification_preferences?: Json
          reading_goal?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          annual_books_goal?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          notification_preferences?: Json
          reading_goal?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reading_history: {
        Row: {
          book_id: string
          created_at: string
          id: string
          new_progress: number
          notes: string | null
          pages_read: number | null
          previous_progress: number
          reading_session_minutes: number | null
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          new_progress?: number
          notes?: string | null
          pages_read?: number | null
          previous_progress?: number
          reading_session_minutes?: number | null
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          new_progress?: number
          notes?: string | null
          pages_read?: number | null
          previous_progress?: number
          reading_session_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_history_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_participants: {
        Row: {
          joined_at: string | null
          schedule_id: string
          status: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          schedule_id: string
          status?: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          schedule_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_participants_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "group_reading_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_creator_is_approved: { Args: never; Returns: undefined }
      join_club_by_invite_code: {
        Args: { p_invite_code: string }
        Returns: string
      }
      regenerate_club_invite_code: {
        Args: { p_club_id: string }
        Returns: string
      }
      remove_club_member: {
        Args: { p_club_id: string; p_user_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      upsert_book_catalog: {
        Args: {
          p_authors?: string
          p_cover_url?: string
          p_description?: string
          p_genre?: string
          p_google_books_id?: string
          p_isbn_10?: string
          p_isbn_13?: string
          p_language?: string
          p_open_library_id?: string
          p_page_count?: number
          p_published_date?: string
          p_publisher?: string
          p_source?: string
          p_subtitle?: string
          p_title: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

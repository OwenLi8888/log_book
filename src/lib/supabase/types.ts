export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          display_name: string | null;
          calorie_target: number | null;
          sleep_target: number | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          calorie_target?: number | null;
          sleep_target?: number | null;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
          calorie_target?: number | null;
          sleep_target?: number | null;
        };
      };
      entries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          highlight: string | null;
          lowlight: string | null;
          mood: number | null;
          notes: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          highlight?: string | null;
          lowlight?: string | null;
          mood?: number | null;
          notes?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          highlight?: string | null;
          lowlight?: string | null;
          mood?: number | null;
          notes?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string | null;
          color: string;
          icon: string | null;
          archived: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category?: string | null;
          color?: string;
          icon?: string | null;
          archived?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          category?: string | null;
          color?: string;
          icon?: string | null;
          archived?: boolean;
          sort_order?: number;
        };
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          date: string;
          completed: boolean;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          date: string;
          completed?: boolean;
        };
        Update: {
          completed?: boolean;
        };
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          exercise: string;
          muscle_group: string | null;
          sets: number | null;
          reps: number | null;
          weight: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          exercise: string;
          muscle_group?: string | null;
          sets?: number | null;
          reps?: number | null;
          weight?: number | null;
          created_at?: string;
        };
        Update: {
          exercise?: string;
          muscle_group?: string | null;
          sets?: number | null;
          reps?: number | null;
          weight?: number | null;
        };
      };
      nutrition: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          calories: number | null;
          protein: number | null;
          carbs: number | null;
          fat: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          updated_at?: string;
        };
      };
      sleep: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          hours: number | null;
          quality: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          hours?: number | null;
          quality?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          hours?: number | null;
          quality?: number | null;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          type: "numeric" | "binary";
          target: number | null;
          current: number | null;
          unit: string | null;
          deadline: string | null;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          type: "numeric" | "binary";
          target?: number | null;
          current?: number | null;
          unit?: string | null;
          deadline?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          type?: "numeric" | "binary";
          target?: number | null;
          current?: number | null;
          unit?: string | null;
          deadline?: string | null;
          completed?: boolean;
          completed_at?: string | null;
        };
      };
      reflections: {
        Row: {
          id: string;
          user_id: string;
          type: "weekly" | "monthly";
          date: string;
          content: Json;
          auto_stats: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "weekly" | "monthly";
          date: string;
          content?: Json;
          auto_stats?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: Json;
          auto_stats?: Json | null;
          updated_at?: string;
        };
      };
      media: {
        Row: {
          id: string;
          user_id: string;
          entry_id: string | null;
          file_url: string;
          file_type: string;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entry_id?: string | null;
          file_url: string;
          file_type: string;
          uploaded_at?: string;
        };
        Update: {
          entry_id?: string | null;
        };
      };
    };
  };
}

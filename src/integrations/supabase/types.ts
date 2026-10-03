export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      donation_settings: {
        Row: {
          account_name: string;
          account_number: string;
          alert_duration_sec: number;
          alert_sound_key: string;
          alert_sound_url: string | null;
          alert_volume: number;
          bank_name: string;
          channel_name: string;
          id: string;
          is_live: boolean;
          overlay_token: string;
          qr_image_url: string | null;
          singleton: boolean;
          tts_enabled: boolean;
          tts_speed: number;
          tts_template: string;
          tts_voice: string;
          updated_at: string;
        };
        Insert: {
          account_name?: string;
          account_number?: string;
          alert_duration_sec?: number;
          alert_sound_key?: string;
          alert_sound_url?: string | null;
          alert_volume?: number;
          bank_name?: string;
          channel_name?: string;
          id?: string;
          is_live?: boolean;
          overlay_token?: string;
          qr_image_url?: string | null;
          singleton?: boolean;
          tts_enabled?: boolean;
          tts_speed?: number;
          tts_template?: string;
          tts_voice?: string;
          updated_at?: string;
        };
        Update: {
          account_name?: string;
          account_number?: string;
          alert_duration_sec?: number;
          alert_sound_key?: string;
          alert_sound_url?: string | null;
          alert_volume?: number;
          bank_name?: string;
          channel_name?: string;
          id?: string;
          is_live?: boolean;
          overlay_token?: string;
          qr_image_url?: string | null;
          singleton?: boolean;
          tts_enabled?: boolean;
          tts_speed?: number;
          tts_template?: string;
          tts_voice?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      donations: {
        Row: {
          amount: number;
          approved_at: string | null;
          created_at: string;
          donor_name: string;
          id: string;
          message: string;
          shown_at: string | null;
          slip_path: string | null;
          status: Database["public"]["Enums"]["donation_status"];
          tts_audio_url: string | null;
        };
        Insert: {
          amount: number;
          approved_at?: string | null;
          created_at?: string;
          donor_name: string;
          id?: string;
          message?: string;
          shown_at?: string | null;
          slip_path?: string | null;
          status?: Database["public"]["Enums"]["donation_status"];
          tts_audio_url?: string | null;
        };
        Update: {
          amount?: number;
          approved_at?: string | null;
          created_at?: string;
          donor_name?: string;
          id?: string;
          message?: string;
          shown_at?: string | null;
          slip_path?: string | null;
          status?: Database["public"]["Enums"]["donation_status"];
          tts_audio_url?: string | null;
        };
        Relationships: [];
      };
      games: {
        Row: {
          cover_image_url: string | null;
          created_at: string;
          created_by: string | null;
          deadline: string | null;
          description: string;
          id: string;
          status: Database["public"]["Enums"]["game_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          cover_image_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          deadline?: string | null;
          description?: string;
          id?: string;
          status?: Database["public"]["Enums"]["game_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          cover_image_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          deadline?: string | null;
          description?: string;
          id?: string;
          status?: Database["public"]["Enums"]["game_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          channel: Database["public"]["Enums"]["vote_channel"];
          created_at: string;
          game_id: string;
          id: string;
          user_id: string;
          vote_date: string;
        };
        Insert: {
          channel: Database["public"]["Enums"]["vote_channel"];
          created_at?: string;
          game_id: string;
          id?: string;
          user_id: string;
          vote_date?: string;
        };
        Update: {
          channel?: Database["public"]["Enums"]["vote_channel"];
          created_at?: string;
          game_id?: string;
          id?: string;
          user_id?: string;
          vote_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "game_vote_counts";
            referencedColumns: ["game_id"];
          },
          {
            foreignKeyName: "votes_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      game_vote_counts: {
        Row: {
          both_votes: number | null;
          clip_votes: number | null;
          game_id: string | null;
          live_votes: number | null;
          total_votes: number | null;
        };
        Relationships: [];
      };
      public_donation_info: {
        Row: {
          account_name: string | null;
          account_number: string | null;
          bank_name: string | null;
          channel_name: string | null;
          is_live: boolean | null;
          qr_image_url: string | null;
        };
        Insert: {
          account_name?: string | null;
          account_number?: string | null;
          bank_name?: string | null;
          channel_name?: string | null;
          is_live?: boolean | null;
          qr_image_url?: string | null;
        };
        Update: {
          account_name?: string | null;
          account_number?: string | null;
          bank_name?: string | null;
          channel_name?: string | null;
          is_live?: boolean | null;
          qr_image_url?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "user";
      donation_status: "pending" | "approved" | "rejected";
      game_status: "pending" | "approved" | "rejected";
      vote_channel: "live" | "clip" | "both";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      donation_status: ["pending", "approved", "rejected"],
      game_status: ["pending", "approved", "rejected"],
      vote_channel: ["live", "clip", "both"],
    },
  },
} as const;

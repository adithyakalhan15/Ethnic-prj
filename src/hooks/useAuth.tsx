"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

import { Profile, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isLoading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: UserRole,
  ) => Promise<{ error: any; profile: Profile | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: any; profile: Profile | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use useState initializer to create the client once
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const mapProfile = (data: any): Profile => {
    return {
      ...data,
      fullName: data.full_name ?? data.fullName,
      avatarUrl: data.avatar_url ?? data.avatarUrl,
      vehicleType: data.vehicle_type ?? data.vehicleType,
      licensePlate: data.license_plate ?? data.licensePlate,
      operatingRadius: data.operating_radius ?? data.operatingRadius,
      createdAt: data.created_at ?? data.createdAt,
      updatedAt: data.updated_at ?? data.updatedAt,
    };
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      if (data) {
        const mappedProfile = mapProfile(data);
        setProfile(mappedProfile);
        return mappedProfile;
      }
    } catch (err) {
      console.error("Exception fetching profile:", err);
    }
    return null;
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn("Auth session error:", error.message);
          // If session error (e.g. refresh token missing), ensure we are signed out
          if (mounted) {
             setSession(null);
             setUser(null);
             setProfile(null);
          }
        } else if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            await fetchProfile(session.user.id);
          }
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log("Auth state change:", event);
      
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // We might want to fetch profile only if we don't have it or if it's a new user
        // But re-fetching ensures freshness.
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: UserRole,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          role: role,
        },
      },
    });

    let userProfile = null;
    if (!error && data.user) {
      userProfile = await fetchProfile(data.user.id);
    }

    return { error, profile: userProfile };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    let userProfile = null;
    if (!error && data.user) {
      userProfile = await fetchProfile(data.user.id);
    }

    return { error, profile: userProfile };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      // Always clear state and redirect even if Supabase errors
      setProfile(null);
      setUser(null);
      setSession(null);
      router.push("/");
      router.refresh();
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Map camelCase to snake_case for Supabase
    const supabaseUpdates: any = { ...updates };
    if (updates.fullName) {
      supabaseUpdates.full_name = updates.fullName;
      delete (supabaseUpdates as any).fullName;
    }
    if (updates.avatarUrl) {
      supabaseUpdates.avatar_url = updates.avatarUrl;
      delete (supabaseUpdates as any).avatarUrl;
    }
    if (updates.vehicleType) {
      supabaseUpdates.vehicle_type = updates.vehicleType;
      delete (supabaseUpdates as any).vehicleType;
    }
    if (updates.licensePlate) {
      supabaseUpdates.license_plate = updates.licensePlate;
      delete (supabaseUpdates as any).licensePlate;
    }
    if (updates.operatingRadius) {
      supabaseUpdates.operating_radius = updates.operatingRadius;
      delete (supabaseUpdates as any).operatingRadius;
    }

    const { error } = await supabase
      .from("profiles")
      .update(supabaseUpdates)
      .eq("id", user.id);

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    }

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isLoading: loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

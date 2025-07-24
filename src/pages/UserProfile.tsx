import { useState, useEffect, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, BookOpen, Target, Award, Calendar, UserPlus, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NudgeButton } from "@/components/NudgeButton";

// ... (interfaces remain the same)

const UserProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState<any | null>(null);
  const [stats, setStats] = useState<any>({
    totalBooks: 0,
    completedBooks: 0,
    currentlyReading: 0,
    currentProgress: 0
  });
  const [achievements, setAchievements] = useState<any[]>([]);
  const [recentBooks, setRecentBooks] = useState<any[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<any>({ status: 'none' });
  const [loading, setLoading] = useState(true);
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const isOwnProfile = user?.id === userId;
  
  // ... (all data fetching and handler functions remain the same)
  const checkFriendshipStatus = useCallback(async () => {
    if (!user || !userId) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFriendshipStatus({
          status: data.requester_id === user.id 
            ? (data.status === 'accepted' ? 'accepted' : 'pending_sent')
            : (data.status === 'accepted' ? 'accepted' : 'pending_received'),
          friendshipId: data.id
        });
      }
    } catch (error) {
      console.error('Error checking friendship status:', error);
    }
  }, [user, userId]);

  const fetchUserData = useCallback(async () => {
    if (!userId) return;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user stats
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('reading_status, reading_progress')
        .eq('user_id', userId);

      if (booksError) throw booksError;

      const totalBooks = booksData.length;
      const completedBooks = booksData.filter(book => book.reading_status === 'completed').length;
      const currentlyReading = booksData.filter(book => book.reading_status === 'reading').length;
      const totalProgress = booksData.reduce((sum, book) => sum + book.reading_progress, 0);
      const currentProgress = totalBooks > 0 ? Math.round(totalProgress / totalBooks) : 0;

      setStats({
        totalBooks,
        completedBooks,
        currentlyReading,
        currentProgress
      });

      // Fetch achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(6);

      if (achievementsError) throw achievementsError;
      setAchievements(achievementsData || []);

      // Fetch recent books
      const { data: recentBooksData, error: recentBooksError } = await supabase
        .from('books')
        .select('id, title, author, cover_url, reading_status, rating, reading_progress')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(6);

      if (recentBooksError) throw recentBooksError;
      setRecentBooks(recentBooksData || []);

      // Check friendship status if not own profile
      if (!isOwnProfile) {
        await checkFriendshipStatus();
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil do usuário",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [userId, isOwnProfile, toast, checkFriendshipStatus]);
  const renderFriendshipButton = () => {
    // ... (function remains the same)
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <Card className="card-enchanted mb-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {profile.display_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-primary mb-2">{profile.display_name || 'Usuário'}</h1>
                {profile.bio && <p className="text-muted-foreground mb-3">{profile.bio}</p>}
                 <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Membro desde {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-end">
              {!isOwnProfile && friendshipStatus.status === 'accepted' && (
                <NudgeButton friendId={userId!} friendName={profile.display_name} />
              )}
              {renderFriendshipButton()}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* ... Stats section ... */}
        </CardContent>
      </Card>
      
      {/* Profile Content */}
      <Tabs defaultValue="books" className="space-y-6">
        {/* ... Tabs content ... */}
      </Tabs>
    </div>
  );
};

export default UserProfile;
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  Calendar as CalendarIcon,
  Plus,
  Edit3,
  Save,
  Trophy,
  Flame,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReadingSession {
  id: string;
  pages_read: number;
  session_duration_minutes: number;
  reading_date: string;
  notes: string;
}

interface ReadingGoal {
  id: string;
  year: number;
  target_books: number;
  target_pages: number;
  current_books: number;
  current_pages: number;
}

interface ReadingProgressProps {
  bookId: string;
  totalPages?: number;
  currentPage?: number;
  onProgressUpdate?: (newProgress: number) => void;
}

export function ReadingProgress({
  bookId,
  totalPages,
  currentPage = 0,
  onProgressUpdate,
}: ReadingProgressProps) {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [goals, setGoals] = useState<ReadingGoal | null>(null);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [newSession, setNewSession] = useState({
    pages_read: "",
    duration_minutes: "",
    notes: "",
    reading_date: new Date(),
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const progressPercentage = totalPages ? (currentPage / totalPages) * 100 : 0;

  useEffect(() => {
    if (user) {
      fetchReadingSessions();
      fetchReadingGoals();
    }
  }, [bookId, user]);

  const fetchReadingSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("reading_sessions")
        .select("*")
        .eq("book_id", bookId)
        .eq("user_id", user?.id)
        .order("reading_date", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching reading sessions:", error);
    }
  };

  const fetchReadingGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("reading_goals")
        .select("*")
        .eq("user_id", user?.id)
        .eq("year", currentYear)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setGoals(data);
    } catch (error) {
      console.error("Error fetching reading goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("reading_goals")
        .insert({
          user_id: user.id,
          year: currentYear,
          target_books: 12,
          target_pages: 3000,
        })
        .select()
        .single();

      if (error) throw error;
      setGoals(data);

      toast({
        title: "Meta criada!",
        description: "Sua meta de leitura foi criada com sucesso.",
      });
    } catch (error) {
      console.error("Error creating goal:", error);
      toast({
        title: "Erro ao criar meta",
        description: "Não foi possível criar sua meta de leitura.",
        variant: "destructive",
      });
    }
  };

  const addSession = async () => {
    if (!user || !newSession.pages_read) return;

    try {
      const sessionData = {
        user_id: user.id,
        book_id: bookId,
        pages_read: parseInt(newSession.pages_read),
        session_duration_minutes: newSession.duration_minutes
          ? parseInt(newSession.duration_minutes)
          : null,
        reading_date: selectedDate?.toISOString().split("T")[0],
        notes: newSession.notes,
      };

      const { error } = await supabase
        .from("reading_sessions")
        .insert(sessionData);

      if (error) throw error;

      // Update reading goals
      if (goals) {
        await supabase
          .from("reading_goals")
          .update({
            current_pages:
              goals.current_pages + parseInt(newSession.pages_read),
          })
          .eq("id", goals.id);
      }

      // Update book progress if callback provided
      const newCurrentPage = currentPage + parseInt(newSession.pages_read);
      if (onProgressUpdate) {
        onProgressUpdate(newCurrentPage);
      }

      toast({
        title: "Sessão adicionada!",
        description: `${newSession.pages_read} páginas registradas.`,
      });

      setIsAddingSession(false);
      setNewSession({
        pages_read: "",
        duration_minutes: "",
        notes: "",
        reading_date: new Date(),
      });

      fetchReadingSessions();
      fetchReadingGoals();
    } catch (error) {
      console.error("Error adding session:", error);
      toast({
        title: "Erro ao adicionar sessão",
        description: "Não foi possível registrar a sessão de leitura.",
        variant: "destructive",
      });
    }
  };

  const calculateReadingStreak = () => {
    if (sessions.length === 0) return 0;

    const sortedSessions = [...sessions].sort(
      (a, b) =>
        new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime(),
    );

    let streak = 0;
    let currentDate = new Date();

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.reading_date);
      const diffTime = Math.abs(currentDate.getTime() - sessionDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    return streak;
  };

  const calculateAveragePages = () => {
    if (sessions.length === 0) return 0;
    const totalPages = sessions.reduce(
      (sum, session) => sum + session.pages_read,
      0,
    );
    return Math.round(totalPages / sessions.length);
  };

  const estimatedTimeToFinish = () => {
    if (!totalPages || !currentPage || sessions.length === 0) return null;

    const remainingPages = totalPages - currentPage;
    const averagePages = calculateAveragePages();

    if (averagePages === 0) return null;

    const daysToFinish = Math.ceil(remainingPages / averagePages);
    return daysToFinish;
  };

  const readingStreak = calculateReadingStreak();
  const averagePages = calculateAveragePages();
  const timeToFinish = estimatedTimeToFinish();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Progresso de Leitura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalPages && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>
                  Páginas lidas: {currentPage} / {totalPages}
                </span>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Flame className="h-6 w-6 mx-auto mb-1 text-orange-500" />
              <div className="text-2xl font-bold">{readingStreak}</div>
              <div className="text-xs text-muted-foreground">Dias seguidos</div>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <BarChart3 className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold">{averagePages}</div>
              <div className="text-xs text-muted-foreground">Páginas/dia</div>
            </div>

            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-1 text-purple-500" />
              <div className="text-2xl font-bold">{timeToFinish || "?"}</div>
              <div className="text-xs text-muted-foreground">
                Dias restantes
              </div>
            </div>

            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <Trophy className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
              <div className="text-2xl font-bold">{sessions.length}</div>
              <div className="text-xs text-muted-foreground">Sessões</div>
            </div>
          </div>

          <Button onClick={() => setIsAddingSession(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Registrar Sessão de Leitura
          </Button>
        </CardContent>
      </Card>

      {/* Reading Goals */}
      {goals ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Meta de Leitura {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>
                    Livros: {goals.current_books} / {goals.target_books}
                  </span>
                  <span>
                    {((goals.current_books / goals.target_books) * 100).toFixed(
                      0,
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={(goals.current_books / goals.target_books) * 100}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>
                    Páginas: {goals.current_pages} / {goals.target_pages}
                  </span>
                  <span>
                    {((goals.current_pages / goals.target_pages) * 100).toFixed(
                      0,
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={(goals.current_pages / goals.target_pages) * 100}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Defina sua meta de leitura
            </h3>
            <p className="text-muted-foreground mb-4">
              Estabeleça objetivos para {currentYear} e acompanhe seu progresso!
            </p>
            <Button onClick={createGoal}>Criar Meta de Leitura</Button>
          </CardContent>
        </Card>
      )}

      {/* Add Session Form */}
      {isAddingSession && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Sessão de Leitura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Páginas lidas
                </label>
                <Input
                  type="number"
                  value={newSession.pages_read}
                  onChange={(e) =>
                    setNewSession((prev) => ({
                      ...prev,
                      pages_read: e.target.value,
                    }))
                  }
                  placeholder="Ex: 25"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Duração (minutos)
                </label>
                <Input
                  type="number"
                  value={newSession.duration_minutes}
                  onChange={(e) =>
                    setNewSession((prev) => ({
                      ...prev,
                      duration_minutes: e.target.value,
                    }))
                  }
                  placeholder="Ex: 60"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Data da leitura
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? selectedDate.toLocaleDateString()
                      : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Anotações (opcional)
              </label>
              <Textarea
                value={newSession.notes}
                onChange={(e) =>
                  setNewSession((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Reflexões sobre a leitura, pontos interessantes..."
                className="min-h-20"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={addSession} disabled={!newSession.pages_read}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Sessão
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingSession(false);
                  setNewSession({
                    pages_read: "",
                    duration_minutes: "",
                    notes: "",
                    reading_date: new Date(),
                  });
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reading Sessions History */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Histórico de Leitura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">
                        {session.pages_read} páginas
                      </Badge>
                      {session.session_duration_minutes && (
                        <Badge variant="outline">
                          {session.session_duration_minutes} min
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(session.reading_date).toLocaleDateString()}
                    </div>
                    {session.notes && (
                      <p className="text-sm mt-1 text-gray-600">
                        {session.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

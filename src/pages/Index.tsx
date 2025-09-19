import React, { useState, useMemo } from "react";
import {
  Plus,
  Trophy,
  Clock,
  Target,
  Presentation,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface Milestone {
  id: number;
  title: string;
  subtitle: string;
  completed: boolean;
  completedAt?: Date;
}

interface Team {
  id: string;
  name: string;
  milestones: Milestone[];
  totalTime: number;
}

const INITIAL_MILESTONES: Milestone[] = [
  {
    id: 1,
    title: "Kickstart Together",
    subtitle: "Get the project rolling with a shared vision.",
    completed: false,
  },
  {
    id: 2,
    title: "Prototype in Action",
    subtitle: "Build a simple, working model of your idea.",
    completed: false,
  },
  {
    id: 3,
    title: "Catalyst Launchpad",
    subtitle: "Deploy your prototype seamlessly on Zoho Catalyst.",
    completed: false,
  },
];

const Index = () => {
  const [teams, setTeams] = useState<Team[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("teams");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Convert completedAt back to Date objects
          return parsed.map((team: Team) => ({
            ...team,
            milestones: team.milestones.map((m: Milestone) => ({
              ...m,
              completedAt: m.completedAt ? new Date(m.completedAt) : undefined,
            })),
          }));
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  // Persist teams to localStorage whenever it changes
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("teams", JSON.stringify(teams));
    }
  }, [teams]);

  const [newTeamName, setNewTeamName] = useState("");
  const [presentationMode, setPresentationMode] = useState(false);
  const [muteAudio, setMuteAudio] = useState(false);
  const [timer, setTimer] = useState(new Date());
  const [timerStarted, setTimerStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Live timer effect
  React.useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (timerStarted) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timer.getTime()) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => interval && clearInterval(interval);
  }, [timerStarted, timer]);

  // Fullscreen effect for presentation mode
  React.useEffect(() => {
    const elem = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    if (presentationMode) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (typeof elem.webkitRequestFullscreen === "function") {
        elem.webkitRequestFullscreen(); // Safari
      } else if (typeof elem.msRequestFullscreen === "function") {
        elem.msRequestFullscreen(); // IE11
      }
    } else {
      if (document.fullscreenElement) {
        const doc = document as Document & {
          webkitExitFullscreen?: () => Promise<void>;
          msExitFullscreen?: () => Promise<void>;
        };
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (typeof doc.webkitExitFullscreen === "function") {
          doc.webkitExitFullscreen(); // Safari
        } else if (typeof doc.msExitFullscreen === "function") {
          doc.msExitFullscreen(); // IE11
        }
      }
    }
  }, [presentationMode]);

  // Reset Data handler
  const handleResetData = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("teams");
    }
    setTeams([]);
    setTimerStarted(false);
  };

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const aCompleted = a.milestones.filter((m) => m.completed).length;
      const bCompleted = b.milestones.filter((m) => m.completed).length;

      // Primary sort: by number of completed milestones
      if (aCompleted !== bCompleted) {
        return bCompleted - aCompleted;
      }

      // Secondary sort: by most recent completion time for teams with same completion count
      const aCompletedMilestones = a.milestones.filter(
        (m) => m.completed && m.completedAt
      );
      const bCompletedMilestones = b.milestones.filter(
        (m) => m.completed && m.completedAt
      );

      if (aCompletedMilestones.length > 0 && bCompletedMilestones.length > 0) {
        // Get the most recent completion time for each team
        const aLatestCompletion = Math.max(
          ...aCompletedMilestones.map((m) => {
            const time =
              m.completedAt instanceof Date
                ? m.completedAt.getTime()
                : new Date(m.completedAt!).getTime();
            return time;
          })
        );
        const bLatestCompletion = Math.max(
          ...bCompletedMilestones.map((m) => {
            const time =
              m.completedAt instanceof Date
                ? m.completedAt.getTime()
                : new Date(m.completedAt!).getTime();
            return time;
          })
        );

        // Earlier completion time comes first
        return aLatestCompletion - bLatestCompletion;
      }

      // Tertiary sort: by team creation order (ID) if no completions
      return parseInt(a.id) - parseInt(b.id);
    });
  }, [teams]);

  const addTeam = () => {
    if (newTeamName.trim()) {
      const newTeam: Team = {
        id: Date.now().toString(),
        name: newTeamName.trim(),
        milestones: INITIAL_MILESTONES.map((m) => ({ ...m })),
        totalTime: 0,
      };
      setTeams([...teams, newTeam]);
      setNewTeamName("");
    }
  };

  const toggleMilestone = (teamId: string, milestoneId: number) => {
    // Play buzzer sound
    if (!muteAudio) {
      const audio = new window.Audio("/level-up.mp3");
      audio.play();
    }
    // Update the team and milestone state
    setTeams(
      teams.map((team) => {
        if (team.id === teamId) {
          const updatedMilestones = team.milestones.map((milestone) => {
            if (milestone.id === milestoneId) {
              const now = new Date();
              const isCompleting = !milestone.completed;
              return {
                ...milestone,
                completed: isCompleting,
                completedAt: isCompleting ? now : undefined,
              };
            }
            return milestone;
          });

          // Calculate total time if all milestones are completed
          let totalTime = 0;
          const completedMilestones = updatedMilestones.filter(
            (m) => m.completed && m.completedAt
          );
          if (completedMilestones.length === 3) {
            const startTime = timer.getTime();
            const endTime = Math.max(
              ...completedMilestones.map((m) => m.completedAt!.getTime())
            );
            totalTime = endTime - startTime;
          }

          return { ...team, milestones: updatedMilestones, totalTime };
        }
        return team;
      })
    );
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getPositionEmoji = (position: number) => {
    switch (position) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${position}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center border-2 border-blue-400">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  D3 Workshop Leader Board
                </h1>
              </div>
              <p className="text-gray-400 text-xl mt-4">
                Track your team's progress through the milestones
              </p>
            </div>
            <div className="flex items-center gap-4">
              {timerStarted && (
                <div className="flex items-center gap-2 text-5xl font-mono">
                  <span className="text-green-400">⏱️</span>
                  <span>
                    {String(Math.floor(elapsed / 3600)).padStart(2, "0")}:
                    {String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}
                    :{String(elapsed % 60).padStart(2, "0")}
                  </span>
                </div>
              )}
              {!presentationMode && (
                <>
                  {!timerStarted && (
                    <button
                      onClick={() => {
                        setTimer(new Date());
                        setTimerStarted(true);
                      }}
                      className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors mr-2"
                      title="Start Timer"
                    >
                      Start Timer
                    </button>
                  )}
                  <button
                    onClick={handleResetData}
                    className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors mr-2"
                    title="Reset all saved data"
                  >
                    Reset Data
                  </button>
                </>
              )}
              <div className="flex items-center gap-2">
                <Presentation className="w-4 h-4" />
                <span className="text-sm">Presentation Mode</span>
                <Switch
                  checked={presentationMode}
                  onCheckedChange={setPresentationMode}
                />
              </div>
              {!presentationMode && (
                <div className="flex items-center gap-2">
                  <VolumeX className="w-4 h-4" />
                  <span className="text-sm">Mute Audio</span>
                  <Switch checked={muteAudio} onCheckedChange={setMuteAudio} />
                </div>
              )}
            </div>
          </div>

          {/* Add Team Section */}
          {!presentationMode && (
            <Card className="bg-gray-800 border-gray-700 mb-6">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Input
                    placeholder="Enter team name..."
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addTeam()}
                    className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                  <Button
                    onClick={addTeam}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedTeams.map((team, index) => {
            const position = index + 1;
            const completedCount = team.milestones.filter(
              (m) => m.completed
            ).length;
            const isFullyCompleted = completedCount === 4;

            return (
              <Card
                key={team.id}
                className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-200 transform hover:scale-105"
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-3xl font-bold text-white capitalize">
                      {team.name}
                    </CardTitle>
                    {isFullyCompleted && (
                      <Badge
                        variant="secondary"
                        size="3xl"
                        className="bg-gray-700 text-white"
                      >
                        {getPositionEmoji(position)}
                      </Badge>
                    )}
                  </div>
                  <hr className="my-2 border-gray-700" />
                  <div className="flex justify-between items-start">
                    <div className="text-sm text-gray-400">
                      Progress: {completedCount}/4 milestones
                    </div>
                    {isFullyCompleted && team.totalTime > 0 && (
                      <div className="text-sm text-green-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Total time: {formatDuration(team.totalTime)}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-start items-start">
                    {isFullyCompleted && (
                      <Badge size="lg" className="bg-green-600 text-white">
                        <Trophy className="w-5 h-5 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {team.milestones.map((milestone) => (
                    <div key={milestone.id} className="space-y-2">
                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          milestone.completed
                            ? "bg-green-900/30 border-green-500 shadow-lg shadow-green-500/20"
                            : "bg-gray-700/50 border-gray-600 hover:border-gray-500"
                        }`}
                        onClick={() => toggleMilestone(team.id, milestone.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Target
                                className={`w-4 h-4 ${
                                  milestone.completed
                                    ? "text-green-400"
                                    : "text-gray-400"
                                }`}
                              />
                              <h4 className="font-semibold text-white">
                                Milestone {milestone.id}: {milestone.title}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-400 mb-2">
                              {milestone.subtitle}
                            </p>
                            {milestone.completed && milestone.completedAt && (
                              <div className="text-xs text-green-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Completed at {formatTime(milestone.completedAt)}
                              </div>
                            )}
                          </div>
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              milestone.completed
                                ? "bg-green-500 border-green-500"
                                : "border-gray-400"
                            }`}
                          >
                            {milestone.completed && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {teams.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mb-4"
            >
              <circle cx="32" cy="32" r="32" fill="#1E293B" />
              <ellipse cx="32" cy="44" rx="18" ry="8" fill="#64748B" />
              <circle cx="32" cy="28" r="8" fill="#94A3B8" />
              <circle cx="18" cy="34" r="5" fill="#94A3B8" />
              <circle cx="46" cy="34" r="5" fill="#94A3B8" />
            </svg>
            <div className="text-gray-400 text-lg mb-4">No teams added yet</div>
            <p className="text-gray-500">Add your first team to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;

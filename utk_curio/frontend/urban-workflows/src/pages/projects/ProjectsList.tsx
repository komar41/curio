import React, { useCallback, useEffect, useState } from "react";
import CSS from "csstype";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../providers/UserProvider";
import { projectsApi, ProjectSummary } from "../../api/projectsApi";

type ViewMode = "grid" | "list";
type FilterTab = "all" | "recent" | "archived";

const ACCENT_COLORS: Record<string, { bg: string; fg: string }> = {
  peach:  { bg: "#FFE3DA", fg: "#E86A3C" },
  sky:    { bg: "#DCE8FF", fg: "#3567C7" },
  mint:   { bg: "#DFF2E1", fg: "#2F8F4A" },
  lilac:  { bg: "#EADCFB", fg: "#7A4BD1" },
};

const ProjectsList: React.FC = () => {
  const { user, signout, enableUserAuth } = useUserContext();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; project: ProjectSummary } | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const scope = filter === "archived" ? "archived" : filter === "recent" ? "recent" : "mine";
      const data = await projectsApi.list({ scope, sort: "last_opened" });
      setProjects(data);
    } catch {
      setProjects([]);
    }
  }, [filter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const dismiss = () => setContextMenu(null);
    if (contextMenu) document.addEventListener("click", dismiss);
    return () => document.removeEventListener("click", dismiss);
  }, [contextMenu]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const handleRename = async (project: ProjectSummary) => {
    const newName = window.prompt("Rename project:", project.name);
    if (!newName || newName === project.name) return;
    try {
      await projectsApi.update(project.id, { name: newName });
      loadProjects();
    } catch (err) {
      console.error("Rename failed:", err);
    }
  };

  const handleDuplicate = async (project: ProjectSummary) => {
    try {
      await projectsApi.duplicate(project.id);
      loadProjects();
    } catch (err) {
      console.error("Duplicate failed:", err);
    }
  };

  const handleArchive = async (project: ProjectSummary) => {
    try {
      await projectsApi.delete(project.id);
      loadProjects();
    } catch (err) {
      console.error("Archive failed:", err);
    }
  };

  const handleDeleteForever = async (project: ProjectSummary) => {
    if (!window.confirm(`Permanently delete "${project.name}"?`)) return;
    try {
      await projectsApi.delete(project.id, { purge: true });
      loadProjects();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const accent = (a: string) => ACCENT_COLORS[a] || ACCENT_COLORS.peach;

  return (
    <div style={pageStyle}>
      {/* Top Nav Bar */}
      <header style={topBarStyle}>
        <div style={topBarLeftStyle}>
          <span style={logoStyle}>Curio</span>
        </div>
        <div style={topBarCenterStyle}>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchInputStyle}
          />
        </div>
        <div style={topBarRightStyle}>
          <span style={userNameStyle}>{user?.name || "User"}</span>
          <div style={avatarStyle}>{initials}</div>
          {enableUserAuth && (
            <button
              style={signoutBtnStyle}
              onClick={async () => {
                await signout();
                navigate("/auth/signin");
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={mainStyle}>
        <div style={pageHeaderStyle}>
          <h1 style={pageTitleStyle}>Projects</h1>
          <button
            style={newWorkflowBtnStyle}
            onClick={() => navigate("/dataflow/new")}
          >
            + New Dataflow
          </button>
        </div>

        {/* Filter Tabs + View Toggle */}
        <div style={controlsRowStyle}>
          <div style={tabsStyle}>
            {(["all", "recent", "archived"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                style={{
                  ...tabBtnStyle,
                  ...(filter === tab ? tabActiveStyle : {}),
                }}
                onClick={() => setFilter(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <div style={viewToggleStyle}>
            <button
              style={{
                ...viewBtnStyle,
                ...(viewMode === "grid" ? viewActiveStyle : {}),
              }}
              onClick={() => setViewMode("grid")}
            >
              Grid
            </button>
            <button
              style={{
                ...viewBtnStyle,
                ...(viewMode === "list" ? viewActiveStyle : {}),
              }}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
          </div>
        </div>

        {/* Project Cards */}
        <div style={viewMode === "grid" ? gridStyle : listGridStyle}>
          {filtered.length === 0 && (
            <p style={emptyStyle}>No projects yet. Create a new dataflow!</p>
          )}
          {filtered.map((p) => (
            <div
              key={p.id}
              style={cardStyle}
              onClick={() => navigate(`/dataflow/${p.id}`)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, project: p });
              }}
            >
              <div style={{ ...cardAccentStyle, backgroundColor: accent(p.thumbnail_accent).fg }} />
              <div style={cardBodyStyle}>
                <span style={cardTitleStyle}>{p.name}</span>
                <span style={cardSubStyle}>
                  {p.description || `Rev ${p.spec_revision}`}
                  {p.last_opened_at ? ` · ${new Date(p.last_opened_at).toLocaleDateString()}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>

        {contextMenu && (
          <div
            style={{
              position: "fixed",
              top: contextMenu.y,
              left: contextMenu.x,
              backgroundColor: "#1E1F23",
              border: "1px solid #333",
              borderRadius: "4px",
              zIndex: 9999,
              minWidth: "160px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <div style={ctxItemStyle} onClick={() => { handleRename(contextMenu.project); setContextMenu(null); }}>
              Rename
            </div>
            <div style={ctxItemStyle} onClick={() => { handleDuplicate(contextMenu.project); setContextMenu(null); }}>
              Duplicate
            </div>
            <div style={ctxItemStyle} onClick={() => { handleArchive(contextMenu.project); setContextMenu(null); }}>
              Archive
            </div>
            <div style={{ ...ctxItemStyle, color: "#ff6b6b" }} onClick={() => { handleDeleteForever(contextMenu.project); setContextMenu(null); }}>
              Delete forever
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProjectsList;

/* ---- Styles ---- */

const ctxItemStyle: CSS.Properties = {
  padding: "8px 16px",
  color: "#fff",
  fontSize: "13px",
  cursor: "pointer",
};

const pageStyle: CSS.Properties = {
  minHeight: "100vh",
  backgroundColor: "#F6F6F8",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const topBarStyle: CSS.Properties = {
  height: "56px",
  backgroundColor: "#0F0F11",
  display: "flex",
  alignItems: "center",
  padding: "0 24px",
  justifyContent: "space-between",
};

const topBarLeftStyle: CSS.Properties = { display: "flex", alignItems: "center" };
const logoStyle: CSS.Properties = {
  color: "#fff",
  fontSize: "18px",
  fontWeight: 700,
  letterSpacing: "0.5px",
};

const topBarCenterStyle: CSS.Properties = { flex: 1, margin: "0 32px" };
const searchInputStyle: CSS.Properties = {
  width: "100%",
  maxWidth: "400px",
  height: "34px",
  padding: "0 12px",
  borderRadius: "6px",
  border: "1px solid #2A2A2E",
  backgroundColor: "#1C1C1F",
  color: "#fff",
  fontSize: "13px",
  outline: "none",
};

const topBarRightStyle: CSS.Properties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const userNameStyle: CSS.Properties = { color: "#fff", fontSize: "13px" };
const avatarStyle: CSS.Properties = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  backgroundColor: "#fff",
  color: "#0F0F11",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 700,
};

const signoutBtnStyle: CSS.Properties = {
  background: "none",
  border: "1px solid #444",
  borderRadius: "4px",
  color: "#aaa",
  fontSize: "12px",
  padding: "4px 10px",
  cursor: "pointer",
};

const mainStyle: CSS.Properties = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "32px 24px",
};

const pageHeaderStyle: CSS.Properties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
};

const pageTitleStyle: CSS.Properties = {
  fontSize: "24px",
  fontWeight: 600,
  color: "#0F0F11",
  margin: 0,
};

const newWorkflowBtnStyle: CSS.Properties = {
  height: "38px",
  padding: "0 20px",
  backgroundColor: "#0F0F11",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const controlsRowStyle: CSS.Properties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const tabsStyle: CSS.Properties = { display: "flex", gap: "4px" };
const tabBtnStyle: CSS.Properties = {
  padding: "6px 14px",
  border: "none",
  background: "none",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  borderRadius: "4px",
  color: "#6B6B76",
};
const tabActiveStyle: CSS.Properties = {
  backgroundColor: "#0F0F11",
  color: "#fff",
};

const viewToggleStyle: CSS.Properties = { display: "flex", gap: "4px" };
const viewBtnStyle: CSS.Properties = {
  padding: "6px 12px",
  border: "1px solid #D0D0D5",
  background: "#fff",
  fontSize: "12px",
  borderRadius: "4px",
  cursor: "pointer",
  color: "#6B6B76",
};
const viewActiveStyle: CSS.Properties = {
  backgroundColor: "#0F0F11",
  color: "#fff",
  borderColor: "#0F0F11",
};

const gridStyle: CSS.Properties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: "16px",
};

const listGridStyle: CSS.Properties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const cardStyle: CSS.Properties = {
  backgroundColor: "#fff",
  borderRadius: "8px",
  overflow: "hidden",
  cursor: "pointer",
  border: "1px solid #E5E5E7",
  transition: "box-shadow 0.15s",
};

const cardAccentStyle: CSS.Properties = {
  height: "6px",
  backgroundColor: "#6C63FF",
};

const cardBodyStyle: CSS.Properties = {
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const cardTitleStyle: CSS.Properties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#0F0F11",
};

const cardSubStyle: CSS.Properties = {
  fontSize: "12px",
  color: "#9E9E9E",
};

const emptyStyle: CSS.Properties = {
  color: "#9E9E9E",
  fontSize: "14px",
  gridColumn: "1 / -1",
  textAlign: "center",
  padding: "40px 0",
};

import { Link, Outlet } from "@tanstack/react-router"
import { usePreferencesStore } from "@/store"
import { themeList } from "@/themes/registry"
import { Button } from "@/components/ui/button"

function App() {
  const theme = usePreferencesStore((s) => s.theme)
  const setTheme = usePreferencesStore((s) => s.setTheme)

  return (
    <div className="min-h-screen flex flex-col bg-(--bg) text-(--fg)">
      <header className="sticky top-0 z-10 backdrop-blur-md border-b border-(--hairline) bg-(--bg)/80">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold text-(--fg)">
              🐱 Cat Portfolio
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <Link
                to="/"
                activeProps={{ className: "text-(--amber)" }}
                className="text-(--fg-muted) hover:text-(--fg)"
              >
                Home
              </Link>
              <Link
                to="/ask"
                activeProps={{ className: "text-(--amber)" }}
                className="text-(--fg-muted) hover:text-(--fg)"
              >
                Ask
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-1.5">
            {themeList.map((t) => (
              <Button
                key={t.id}
                size="xs"
                variant={theme === t.id ? "default" : "ghost"}
                onClick={() => setTheme(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="py-6 text-center text-xs font-mono text-(--fg-muted) border-t border-(--hairline) max-w-4xl mx-auto w-full px-4">
        schema-driven blocks · GenUI layout.json · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

export default App

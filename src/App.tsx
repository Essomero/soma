import { lazy } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import HomePage from "@/pages/HomePage";
import AuthGuard from "@/components/auth/AuthGuard";

const GenericFeaturedPage = lazy(() => import("@/pages/GenericFeaturedPage"));
const DeveloperStoryPage = lazy(() => import("@/pages/DeveloperStoryPage"));
const GuidePage = lazy(() => import("@/pages/GuidePage"));
const StoryPage = lazy(() => import("@/pages/StoryPage"));
const StoriesIndexPage = lazy(() => import("@/pages/StoriesIndexPage"));
const GuidesIndexPage = lazy(() => import("@/pages/GuidesIndexPage"));
const GuideContentPage = lazy(() => import("@/pages/GuideContentPage"));
const PodcastPage = lazy(() => import("@/pages/PodcastPage"));
const PodcastEpisodePage = lazy(() => import("@/pages/PodcastEpisodePage"));
const SearchResultsPage = lazy(() => import("@/pages/SearchResultsPage"));
const TopicsPage = lazy(() => import("@/pages/TopicsPage"));
const TopicDetailPage = lazy(() => import("@/pages/TopicDetailPage"));
const CoursesIndexPage = lazy(() => import("@/pages/CoursesIndexPage"));
const CourseDetailPage = lazy(() => import("@/pages/CourseDetailPage"));
const ArchivePage = lazy(() => import("@/pages/ArchivePage"));
const BooksIndexPage = lazy(() => import("@/pages/BooksIndexPage"));
const BookDetailPage = lazy(() => import("@/pages/BookDetailPage"));
const SeriesIndexPage = lazy(() => import("@/pages/SeriesIndexPage"));
const SeriesDetailPage = lazy(() => import("@/pages/SeriesDetailPage"));
const DocsIndexPage = lazy(() => import("@/pages/DocsIndexPage"));
const DocPage = lazy(() => import("@/pages/DocPage"));
const NotesIndexPage = lazy(() => import("@/pages/NotesIndexPage"));
const NotesEditorPage = lazy(() => import("@/pages/NotesEditorPage"));
const NotesArticlePage = lazy(() => import("@/pages/NotesArticlePage"));
const TestsIndexPage = lazy(() => import("@/pages/TestsIndexPage"));
const TestPage = lazy(() => import("@/pages/TestPage"));
const TestPrintPage = lazy(() => import("@/pages/TestPrintPage"));
const CollectionPrintPage = lazy(() => import("@/pages/CollectionPrintPage"));
const SinglePrintPage = lazy(() => import("@/pages/SinglePrintPage"));
const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage"));
const AdminNewPage = lazy(() => import("@/pages/AdminNewPage"));
const AdminEditPage = lazy(() => import("@/pages/AdminEditPage"));
const router = createBrowserRouter([
  {
    path: "courses/:slug/print",
    element: (<AuthGuard><CollectionPrintPage type="course" /></AuthGuard>),
  },
  {
    path: "series/:slug/print",
    element: (<AuthGuard><CollectionPrintPage type="series" /></AuthGuard>),
  },
  {
    path: "books/:slug/print",
    element: (<AuthGuard><CollectionPrintPage type="book" /></AuthGuard>),
  },
  {
    path: "stories/:slug/print",
    element: (<AuthGuard><SinglePrintPage type="story" base="stories" /></AuthGuard>),
  },
  {
    path: "featured/:slug/print",
    element: (<AuthGuard><SinglePrintPage type="featured" base="featured" /></AuthGuard>),
  },
  {
    path: "guides/:slug/print",
    element: (<AuthGuard><SinglePrintPage type="guide" base="guides" /></AuthGuard>),
  },
  {
    path: "docs/:slug/print",
    element: (<AuthGuard><SinglePrintPage type="doc" base="docs" /></AuthGuard>),
  },
  {
    path: "podcast/:slug/print",
    element: (<AuthGuard><SinglePrintPage type="episode" base="podcast" /></AuthGuard>),
  },
  {
    path: "tests/:slug/print",
    element: (<AuthGuard><TestPrintPage /></AuthGuard>),
  },
  {
    element: <Layout />,
    children: [
      // Home
      { index: true, element: <HomePage /> },

      // Featured articles — generic handles any slug including why-i-built-soma and vision roadmap
      {
        path: "featured/:slug",
        element: <GenericFeaturedPage />,
      },
      {
        path: "featured/structural-typing",
        element: <Navigate to="/featured/why-i-built-soma" replace />,
      },

      // Developer stories (index + individual)
      {
        path: "stories",
        element: <StoriesIndexPage />,
      },
      {
        path: "stories/origin-story",
        element: <DeveloperStoryPage />,
      },
      {
        path: "stories/ruth-ikegah",
        element: <Navigate to="/stories/origin-story" replace />,
      },
      {
        path: "stories/:slug",
        element: <StoryPage />,
      },

      // Guides (index + individual)
      {
        path: "guides",
        element: <GuidesIndexPage />,
      },
      {
        path: "guides/ship-soma",
        element: <GuidePage />,
      },
      {
        path: "guides/generative-ai",
        element: <Navigate to="/guides/ship-soma" replace />,
      },
      {
        path: "guides/:slug",
        element: <GuideContentPage />,
      },

      // Podcast
      {
        path: "podcast",
        element: <PodcastPage />,
      },
      {
        path: "podcast/:slug",
        element: <PodcastEpisodePage />,
      },

      // Search
      {
        path: "search",
        element: <SearchResultsPage />,
      },

      // Topics
      {
        path: "topics",
        element: <TopicsPage />,
      },
      {
        path: "topics/:slug",
        element: <TopicDetailPage />,
      },

      // Courses
      {
        path: "courses",
        element: <CoursesIndexPage />,
      },
      {
        path: "courses/:slug",
        element: <CourseDetailPage />,
      },

      // Books
      {
        path: "books",
        element: <BooksIndexPage />,
      },
      {
        path: "books/:slug",
        element: <BookDetailPage />,
      },

      // Series
      {
        path: "series",
        element: <SeriesIndexPage />,
      },
      {
        path: "series/:slug",
        element: <SeriesDetailPage />,
      },

      // Docs (reference material: index + individual)
      {
        path: "docs",
        element: <DocsIndexPage />,
      },
      {
        path: "docs/:slug",
        element: <DocPage />,
      },

      // Tests (diagnostic tests: index + individual runner)
      {
        path: "tests",
        element: <TestsIndexPage />,
      },
      {
        path: "tests/:slug",
        element: <TestPage />,
      },

      // Archive
      {
        path: "archive",
        element: <ArchivePage />,
      },

      // Admin (content management)
      {
        path: "admin",
        element: <AdminDashboardPage />,
      },
      {
        path: "admin/new",
        element: <AdminNewPage />,
      },
      {
        path: "admin/:type/:slug/edit",
        element: <AdminEditPage />,
      },

      // Notes (user-authored: index login-gated; article public if toggled)
      {
        path: "notes",
        element: <NotesIndexPage />,
      },
      {
        path: "notes/new",
        element: <NotesEditorPage />,
      },
      {
        path: "notes/:slug/edit",
        element: <NotesEditorPage />,
      },
      {
        path: "notes/:slug",
        element: <NotesArticlePage />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

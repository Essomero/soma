import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import HomePage from "@/pages/HomePage";
import FeaturedArticlePage from "@/pages/FeaturedArticlePage";
import DeveloperStoryPage from "@/pages/DeveloperStoryPage";
import GuidePage from "@/pages/GuidePage";
import StoryPage from "@/pages/StoryPage";
import StoriesIndexPage from "@/pages/StoriesIndexPage";
import GuidesIndexPage from "@/pages/GuidesIndexPage";
import GuideContentPage from "@/pages/GuideContentPage";
import PodcastPage from "@/pages/PodcastPage";
import PodcastEpisodePage from "@/pages/PodcastEpisodePage";
import SearchResultsPage from "@/pages/SearchResultsPage";
import TopicsPage from "@/pages/TopicsPage";
import TopicDetailPage from "@/pages/TopicDetailPage";
import CoursesIndexPage from "@/pages/CoursesIndexPage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import ArchivePage from "@/pages/ArchivePage";
import BooksIndexPage from "@/pages/BooksIndexPage";
import BookDetailPage from "@/pages/BookDetailPage";
import SeriesIndexPage from "@/pages/SeriesIndexPage";
import SeriesDetailPage from "@/pages/SeriesDetailPage";
import DocsIndexPage from "@/pages/DocsIndexPage";
import DocPage from "@/pages/DocPage";
import NotesIndexPage from "@/pages/NotesIndexPage";
import NotesEditorPage from "@/pages/NotesEditorPage";
import NotesArticlePage from "@/pages/NotesArticlePage";
import TestsIndexPage from "@/pages/TestsIndexPage";
import TestPage from "@/pages/TestPage";
import TestPrintPage from "@/pages/TestPrintPage";
import CollectionPrintPage from "@/pages/CollectionPrintPage";
import SinglePrintPage from "@/pages/SinglePrintPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import AdminNewPage from "@/pages/AdminNewPage";
import AdminEditPage from "@/pages/AdminEditPage";
import AuthGuard from "@/components/auth/AuthGuard";
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

      // Featured articles
      {
        path: "featured/why-i-built-soma",
        element: <FeaturedArticlePage />,
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
        path: "stories/benjamin-mayanja",
        element: <DeveloperStoryPage />,
      },
      {
        path: "stories/ruth-ikegah",
        element: <Navigate to="/stories/benjamin-mayanja" replace />,
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

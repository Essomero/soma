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
import LearnIndexPage from "@/pages/LearnIndexPage";
import LearnEditorPage from "@/pages/LearnEditorPage";
import LearnArticlePage from "@/pages/LearnArticlePage";
import TestsIndexPage from "@/pages/TestsIndexPage";
import TestPage from "@/pages/TestPage";
import CollectionPrintPage from "@/pages/CollectionPrintPage";
import SinglePrintPage from "@/pages/SinglePrintPage";
const router = createBrowserRouter([
  {
    path: "courses/:slug/print",
    element: <CollectionPrintPage type="course" />,
  },
  {
    path: "series/:slug/print",
    element: <CollectionPrintPage type="series" />,
  },
  {
    path: "books/:slug/print",
    element: <CollectionPrintPage type="book" />,
  },
  {
    path: "stories/:slug/print",
    element: <SinglePrintPage type="story" base="stories" />,
  },
  {
    path: "featured/:slug/print",
    element: <SinglePrintPage type="story" base="featured" />,
  },
  {
    path: "guides/:slug/print",
    element: <SinglePrintPage type="guide" base="guides" />,
  },
  {
    path: "docs/:slug/print",
    element: <SinglePrintPage type="doc" base="docs" />,
  },
  {
    path: "podcast/:slug/print",
    element: <SinglePrintPage type="episode" base="podcast" />,
  },
  {
    element: <Layout />,
    children: [
      // Home
      { index: true, element: <HomePage /> },

      // Featured articles
      {
        path: "featured/nvda-accessibility",
        element: <FeaturedArticlePage />,
      },
      {
        path: "featured/:slug",
        element: <StoryPage />,
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
        path: "guides/generative-ai",
        element: <GuidePage />,
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

      // Learn (user-authored notes: index login-gated; article public if toggled)
      {
        path: "learn",
        element: <LearnIndexPage />,
      },
      {
        path: "learn/new",
        element: <LearnEditorPage />,
      },
      {
        path: "learn/:slug/edit",
        element: <LearnEditorPage />,
      },
      {
        path: "learn/:slug",
        element: <LearnArticlePage />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

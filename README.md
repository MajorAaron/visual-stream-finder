# Visual Stream Finder

**Visual Stream Finder** is a smart and intuitive web application designed to identify movies and TV shows from images or text descriptions. Once identified, it quickly tells you where you can stream them online. Say goodbye to endless searching and hello to instant streaming!

## ✨ Key Features

-   **AI-Powered Recognition**: Upload an image or just type in a description, and our AI will identify the movie or TV show for you.
-   **Instant Streaming Links**: Get direct links to streaming platforms like Netflix, Hulu, and more.
-   **Personal Watchlist**: Keep track of what you want to watch.
-   **Watched History**: Maintain a list of everything you've already seen.
-   **Multi-Platform Search**: Seamlessly search across various streaming services.
-   **User Authentication**: Securely sign up and log in with your email or social accounts (Google, GitHub, Discord).

## 🛠️ Tech Stack

-   **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
-   **Backend**: Supabase (Authentication, Database, Edge Functions)
-   **AI & Data**: OpenAI API, TMDB API, YouTube Data API, Firecrawl API
-   **State Management**: React Query
-   **Routing**: React Router

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   Node.js and npm
-   Supabase CLI

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/visual-stream-finder.git
    cd visual-stream-finder
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Supabase:**
    Start the local Supabase stack:
    ```bash
    npx supabase start
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:8080`.

### Environment Variables

To run this project, you will need to add the following environment variables. For local development, you can create a `.env` file inside the `supabase/functions` directory.

-   `OPENAI_API_KEY`: Your API key for OpenAI.
-   `TMDB_API_KEY`: Your API key for The Movie Database (TMDB).
-   `YOUTUBE_API_KEY`: Your API key for the YouTube Data API.
-   `STREAMING_AVAILABILITY_API_KEY`: Your API key for the Streaming Availability API.

**Example `supabase/functions/.env` file:**

```
OPENAI_API_KEY="your_openai_api_key"
TMDB_API_KEY="your_tmdb_api_key"
YOUTUBE_API_KEY="your_youtube_api_key"
STREAMING_AVAILABILITY_API_KEY="your_streaming_availability_api_key"
```

After creating the `.env` file, you need to serve the edge functions with the environment variables:

```bash
npx supabase functions serve --env-file supabase/functions/.env
```

## 📸 Screenshots

Here are some screenshots of the application in action.

*Main Interface after a search*
![Main Interface](https://via.placeholder.com/800x450.png?text=Main+Interface)

*User Watchlist*
![Watchlist](https://via.placeholder.com/800x450.png?text=User+Watchlist)

*User Profile Page*
![Profile Page](https://via.placeholder.com/800x450.png?text=Profile+Page)

## ☁️ Deployment

This application is deployed on GitHub Pages. The deployment process is automated using GitHub Actions. When changes are pushed to the `main` branch, a workflow automatically builds the project and deploys it.

To set this up for your own fork, you need to:
1.  Go to your repository's **Settings** -> **Pages**.
2.  Under **Build and deployment**, select **GitHub Actions** as the source.
3.  The application uses `HashRouter` for client-side routing to ensure compatibility with GitHub Pages.
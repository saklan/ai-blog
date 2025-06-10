
import React, { useState, useCallback, useEffect } from 'react';
import { GeneratedContent, GroundingChunk } from './types';
import { generateBlogPostContent, generateTrendingTopics } from './services/geminiService';
import { LoadingSpinner } from './components/LoadingSpinner';
import { GeneratedSection } from './components/GeneratedSection';
import { Pill } from './components/Pill';

const App: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrendingTopics, setShowTrendingTopics] = useState<boolean>(false);

  const handleFetchTrendingTopics = useCallback(async () => {
    setIsLoadingTopics(true);
    setError(null);
    setTrendingTopics([]);
    setGroundingChunks([]);
    setShowTrendingTopics(true); // Show section immediately
    try {
      const result = await generateTrendingTopics();
      if (result.topics && result.topics.length > 0) {
        setTrendingTopics(result.topics);
      } else {
        setTrendingTopics(['Could not fetch trending topics. The model might be unable to find current trends or there was an issue. Please try again or use a manual topic.']);
      }
      if (result.sources) {
        setGroundingChunks(result.sources as GroundingChunk[]); // Cast as per local type
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trending topics. Ensure your API key is correctly configured.');
      setTrendingTopics(['Failed to load topics.']);
    } finally {
      setIsLoadingTopics(false);
    }
  }, []);

  // Effect to fetch trending topics on initial load, but only if user hasn't interacted yet.
  // This can be removed if auto-fetching on load is not desired.
  useEffect(() => {
    // Check if API_KEY is likely available before attempting to fetch.
    // This is a proxy check; actual key validity is handled by geminiService.
    if (process.env.API_KEY) { 
        handleFetchTrendingTopics();
    } else {
        setShowTrendingTopics(true); // Show the section, but it will indicate an API key issue.
        setTrendingTopics(["API key not detected. Please ensure it's configured to fetch trending topics."]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs once on mount


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }
    setIsLoadingContent(true);
    setError(null);
    setGeneratedContent(null);

    try {
      const content = await generateBlogPostContent(topic);
      setGeneratedContent(content);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Ensure your API key is correctly configured.');
      setGeneratedContent(null);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSelectTopic = (selectedTopic: string) => {
    // If the selected topic is one of the error messages, don't set it as the input topic
    if (selectedTopic.toLowerCase().includes('could not fetch') || selectedTopic.toLowerCase().includes('failed to load') || selectedTopic.toLowerCase().includes('api key not detected')) {
        return;
    }
    setTopic(selectedTopic);
    const topicInput = document.getElementById('topic-input');
    if (topicInput) {
        topicInput.focus();
        window.scrollTo({ top: topicInput.offsetTop - 100, behavior: 'smooth' });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-slate-100 p-4 sm:p-6 md:p-8 flex flex-col items-center font-inter">
      <header className="w-full max-w-4xl mb-8 text-center animate-text-focus-in">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 mb-2">
          AI Blog Content Assistant
        </h1>
        <p className="text-slate-400 text-lg">
          Generate SEO-friendly blog content effortlessly.
        </p>
      </header>

      <main className="w-full max-w-4xl bg-slate-800 shadow-2xl rounded-xl p-6 sm:p-8">
        
      {showTrendingTopics && (
        <section id="trending-topics" className="mb-8 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-sky-400">Discover Trending Topics</h2>
            <button
                onClick={handleFetchTrendingTopics}
                disabled={isLoadingTopics}
                className="bg-sky-600 hover:bg-sky-700 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out flex items-center justify-center text-sm"
                title="Refresh trending topics"
            >
                {isLoadingTopics ? (
                <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Fetching...</span>
                </>
                ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                )}
            </button>
          </div>
          
          {isLoadingTopics && <p className="text-slate-400 mt-2 text-sm text-center">Fetching latest trends, this may take a moment...</p>}
          {!isLoadingTopics && trendingTopics.length > 0 && (
            <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
              <h3 className="text-lg font-medium text-emerald-400 mb-2">Suggested Topics (via Google Search):</h3>
              <ul className="space-y-1 text-slate-300">
                {trendingTopics.map((trend, index) => (
                  <li key={index} className="cursor-pointer hover:text-sky-300 transition-colors duration-150 p-1 rounded hover:bg-slate-600/50" onClick={() => handleSelectTopic(trend)}>
                    {trend}
                  </li>
                ))}
              </ul>
              {groundingChunks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <h4 className="text-sm font-semibold text-slate-400 mb-1">Sources:</h4>
                  <ul className="list-none space-y-1 text-xs">
                    {groundingChunks.map((chunk, idx) => (
                      chunk.web.uri ? ( // Only render if URI exists
                        <li key={idx}>
                          <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-400 hover:underline">
                            {chunk.web.title || chunk.web.uri}
                          </a>
                        </li>
                      ) : null
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
           {!isLoadingTopics && trendingTopics.length === 0 && (
             <p className="text-slate-400 mt-2 text-sm text-center">No trending topics found or an error occurred. Try refreshing or enter a topic manually.</p>
           )}
        </section>
      )}
        
        <form onSubmit={handleSubmit} className="space-y-6 mb-8">
          <div>
            <label htmlFor="topic-input" className="block text-xl font-semibold text-sky-400 mb-2">
              Enter Blog Post Topic
            </label>
            <input
              id="topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., 'The Future of Renewable Energy' or select from trending topics"
              className="w-full p-4 bg-slate-700 text-slate-100 border border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition duration-150 ease-in-out shadow-sm placeholder-slate-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoadingContent || !topic.trim()}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-emerald-800 disabled:to-teal-900 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out text-lg flex items-center justify-center"
          >
            {isLoadingContent ? (
              <>
                <LoadingSpinner /> 
                <span className="ml-2">Generating Content...</span>
              </>
            ) : (
              '✨ Generate Blog Content'
            )}
          </button>
        </form>

        {error && (
          <div className="my-6 p-4 bg-red-700/80 text-red-100 border border-red-900 rounded-lg shadow-md animate-fade-in">
            <div className="flex justify-between items-center">
                <p className="font-semibold text-lg">Error</p>
                <button onClick={() => setError(null)} className="text-red-200 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {isLoadingContent && (
          <div className="text-center py-10">
            <LoadingSpinner size="lg" color="text-sky-400" />
            <p className="mt-4 text-slate-300 text-lg">Generating your blog content... this can take a moment.</p>
          </div>
        )}

        {generatedContent && !isLoadingContent && (
          <div className="space-y-8 mt-8 animate-fade-in">
            <GeneratedSection title="Suggested Blog Titles" content={generatedContent.titles.join('\n')} customRender={() => ( // Pass content for copy button if needed, but render with custom logic
              <ul className="list-none space-y-2">
                {generatedContent.titles.map((title, index) => (
                  <li key={index} className="text-slate-300 hover:text-sky-300 transition-colors p-2 bg-slate-600/30 rounded">
                    <span className="text-sky-400 mr-2 font-medium">{index + 1}.</span>{title}
                  </li>
                ))}
              </ul>
            )} />

            <GeneratedSection title="SEO Meta Description" content={generatedContent.meta_description} />
            
            <GeneratedSection title="Keywords / Tags" content={generatedContent.keywords.join(', ')} customRender={() => (
              <div className="flex flex-wrap gap-2">
                {generatedContent.keywords.map((keyword, index) => (
                  <Pill key={index} text={keyword} />
                ))}
              </div>
            )} />

            <GeneratedSection title="Draft Blog Content" content={generatedContent.draft_content} isPreformatted={true} />
            
            <GeneratedSection title="Featured Image Prompt (for AI Image Generators)" content={generatedContent.image_prompt} />
          </div>
        )}
      </main>
      <footer className="w-full max-w-4xl mt-12 text-center text-slate-500 text-sm">
        <p>Powered by Google Gemini. API Key must be configured in environment variables.</p>
        <p>&copy; {new Date().getFullYear()} AI Blog Content Assistant. For demonstration purposes.</p>
      </footer>
    </div>
  );
};

export default App;

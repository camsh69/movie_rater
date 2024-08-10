import { useEffect, useRef, useState } from "react";
import { useLocalStorageState } from "./useLocalStorage";
import { useKey } from "./useKey";

const average = arr =>
  arr.reduce((acc, cur, i, arr) => acc + cur / arr.length, 0);

const KEY = process.env.REACT_APP_API_KEY;

export default function App() {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [saved, setSaved] = useLocalStorageState([], "saved");

  function handleSelectMovie(id) {
    setSelectedId(selectedId => (id === selectedId ? null : id));
  }

  function handleCloseMovie() {
    setSelectedId(null);
  }

  function handleAddSaved(movie) {
    setSaved(saved => [...saved, movie]);
  }

  function handleDeleteSaved(id) {
    setSaved(saved => saved.filter(movie => movie.imdbID !== id));
  }

  function handleDeleteAll() {
    setSaved([]);
  }

  useEffect(
    function () {
      const controller = new AbortController();

      async function fetchMovies() {
        try {
          setIsLoading(true);
          setError("");
          const res = await fetch(
            `https://www.omdbapi.com/?apikey=${KEY}&s=${query}`,
            { signal: controller.signal }
          );

          if (!res.ok)
            throw new Error("Something went wrong with fetching movies");

          const data = await res.json();
          if (data.Response === "False") throw new Error("Movie not found");

          setMovies(data.Search);
          setError("");
        } catch (err) {
          if (err.name !== "AbortError") setError(err.message);
          console.log(err.message);
        } finally {
          setIsLoading(false);
        }
      }
      if (query.length < 3) {
        setMovies([]);
        setError("");
        return;
      }

      handleCloseMovie();
      fetchMovies();

      return function () {
        controller.abort();
      };
    },
    [query]
  );

  return (
    <>
      <NavBar>
        <Search query={query} setQuery={setQuery} />
        <NumberResults movies={movies} />
      </NavBar>

      <Main>
        <Box>
          {isLoading && <Loader />}
          {!isLoading && !error && (
            <MovieList movies={movies} onSelectedMovie={handleSelectMovie} />
          )}
          {error && <ErrorMessage message={error} />}
        </Box>
        <Box>
          {selectedId ? (
            <MovieDetails
              selectedId={selectedId}
              onCloseMovie={handleCloseMovie}
              onAddSaved={handleAddSaved}
              saved={saved}
            />
          ) : (
            <>
              <SavedSummary saved={saved} />
              <SavedMovieList
                saved={saved}
                onDeleteSaved={handleDeleteSaved}
                onDeleteAll={handleDeleteAll}
              />
            </>
          )}
        </Box>
      </Main>
    </>
  );
}

function Loader() {
  return <p className='loader'>Loading...</p>;
}

function ErrorMessage({ message }) {
  return (
    <p className='error'>
      <span>⛔️</span> {message}
    </p>
  );
}

function NavBar({ children }) {
  return (
    <nav className='nav-bar'>
      <Logo />
      {children}
    </nav>
  );
}

function Logo() {
  return (
    <div className='logo'>
      <span role='img'>🎬</span>
      <h1>John's Movie Rater</h1>
    </div>
  );
}

function Search({ query, setQuery }) {
  const inputEl = useRef(null);

  useEffect(function () {
    inputEl.current.focus();
  }, []);

  return (
    <input
      className='search'
      type='text'
      placeholder='Search movies...'
      value={query}
      onChange={e => setQuery(e.target.value)}
      ref={inputEl}
    />
  );
}

function NumberResults({ movies }) {
  return (
    <p className='num-results'>
      Found <strong>{movies.length}</strong> results
    </p>
  );
}

function Main({ children }) {
  return <main className='main'>{children}</main>;
}

function Box({ children }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className='box'>
      <button className='btn-toggle' onClick={() => setIsOpen(open => !open)}>
        {isOpen ? "–" : "+"}
      </button>
      {isOpen && children}
    </div>
  );
}

function MovieList({ movies, onSelectedMovie }) {
  return (
    <ul className='list list-movies'>
      {movies?.map(movie => (
        <Movie
          movie={movie}
          onSelectedMovie={onSelectedMovie}
          key={movie.imdbID}
        />
      ))}
    </ul>
  );
}

function Movie({ movie, onSelectedMovie }) {
  return (
    <li onClick={() => onSelectedMovie(movie.imdbID)}>
      <img src={movie.Poster} alt={`${movie.Title} poster`} />
      <h3>{movie.Title}</h3>
      <div>
        <p>
          <span>🗓</span>
          <span>{movie.Year}</span>
        </p>
      </div>
    </li>
  );
}

function MovieDetails({ selectedId, onCloseMovie, onAddSaved, saved }) {
  const [movie, setMovie] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isSaved = saved.map(movie => movie.imdbID).includes(selectedId);

  const {
    Title: title,
    Poster: poster,
    Year: year,
    Runtime: runtime,
    imdbRating,
    Plot: plot,
    Released: released,
    Actors: actors,
    Director: director,
    Genre: genre,
  } = movie;

  function handleAdd() {
    const newSavedMovie = {
      imdbID: selectedId,
      title,
      year,
      poster,
      imdbRating: Number(imdbRating),
      runtime: Number(runtime.split(" ").at(0)),
    };
    onAddSaved(newSavedMovie);
    onCloseMovie();
  }

  useEffect(
    function () {
      setIsLoading(true);
      setError("");
      async function getMovieDetails() {
        try {
          const res = await fetch(
            `https://www.omdbapi.com/?apikey=${KEY}&i=${selectedId}`
          );
          if (!res.ok)
            throw new Error("Something went wrong with fetching movie details");

          const data = await res.json();
          setMovie(data);
          setIsLoading(false);
        } catch (err) {
          console.log(err.message);
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      }
      getMovieDetails();
    },
    [selectedId]
  );

  useEffect(
    function () {
      if (!title) return;
      document.title = `Movie | ${title}`;

      return function () {
        document.title = "John's Movie Rater";
      };
    },
    [title]
  );

  useKey("Escape", onCloseMovie);

  return (
    <div className='details'>
      {isLoading && <Loader />}
      {!isLoading && !error && (
        <>
          <header>
            <button className='btn-back' onClick={onCloseMovie}>
              &larr;
            </button>
            <img src={poster} alt={`Poster of ${movie}`} />
            <div className='details-overview'>
              <h2>{title}</h2>
              <p>
                {released} &bull; {runtime}
              </p>
              <p>{genre}</p>
              <p>
                <span>⭐️</span> {imdbRating} IMDb rating
              </p>
            </div>
          </header>
          <section>
            <div
              className='rating'
              style={{ textAlign: "center", fontSize: "4rem" }}
            >
              <p>
                {imdbRating === "N/A" && `Oh Oh! 👎`}
                {imdbRating < 5 && `It's a stinker 💩`}
                {imdbRating >= 5 && imdbRating < 6.5 && `Likely crap ⛔️`}
                {imdbRating >= 6.5 && imdbRating < 8 && `Likely okay 👍`}
                {imdbRating >= 8 && `Highly rated 🎉`}
              </p>
            </div>
            <p>
              <em>{plot}</em>
            </p>
            <p>Starring {actors}</p>
            <p>Directed by {director}</p>
            <div className='rating'>
              {isSaved ? (
                <span style={{ textAlign: "center" }}>
                  Already added to download list 👍
                </span>
              ) : (
                <button className='btn-add' onClick={handleAdd}>
                  + Add to download list
                </button>
              )}
            </div>
          </section>
        </>
      )}
      {error && <ErrorMessage message={error} />}
    </div>
  );
}

function SavedSummary({ saved }) {
  const avgImdbRating = average(saved.map(movie => movie.imdbRating));
  const avgRuntime = average(saved.map(movie => movie.runtime));

  return (
    <div className='summary'>
      <h2>Download List</h2>
      <div>
        <p>
          <span>#️⃣</span>
          <span>{saved.length} movies</span>
        </p>
        <p>
          <span>⭐️</span>
          <span>{avgImdbRating.toFixed(2)}</span>
        </p>
        <p>
          <span>⏳</span>
          <span>{avgRuntime.toFixed(0)} min</span>
        </p>
      </div>
    </div>
  );
}

function SavedMovieList({ saved, onDeleteSaved, onDeleteAll }) {
  return (
    <>
      <ul className='list'>
        {saved.map(movie => (
          <SavedMovie
            movie={movie}
            onDeleteSaved={onDeleteSaved}
            key={movie.imdbID}
          />
        ))}
      </ul>
      {saved.length >= 2 && (
        <div className='rating'>
          <button className='btn-add' onClick={onDeleteAll}>
            Clear all
          </button>
        </div>
      )}
    </>
  );
}

function SavedMovie({ movie, onDeleteSaved }) {
  return (
    <li>
      <img src={movie.poster} alt={`${movie.title} poster`} />
      <h3>
        {movie.title} &bull; {movie.year}
      </h3>
      <div>
        <p>
          <span>⭐️</span>
          <span>{movie.imdbRating.toFixed(2)}</span>
        </p>
        <p>
          <span>⏳</span>
          <span>{movie.runtime} min</span>
        </p>
        <p>
          <span>
            {movie.imdbRating < 5 && `💩`}
            {movie.imdbRating >= 5 && movie.imdbRating < 6.5 && `⛔️`}
            {movie.imdbRating >= 6.5 && movie.imdbRating < 8 && `👍`}
            {movie.imdbRating >= 8 && `🎉`}
          </span>
        </p>
        <button
          className='btn-delete'
          onClick={() => onDeleteSaved(movie.imdbID)}
        >
          X
        </button>
      </div>
    </li>
  );
}

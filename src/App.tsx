import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import classNames from 'classnames';
import { AuthContext } from './components/Auth/AuthContext';
import { Todo } from './types/Todo';
import {
  getTodos,
  addTodos,
  deleteTodos,
  updateTodos,
} from './api/todos';
import { NewTodoField } from './components/NewTodoField/NewTodoField';
import { TodoList } from './components/TodoList/TodoList';
import { Footer } from './components/Footer/Footer';
import { FilterType } from './types/Filtertype';
import { ErrorType } from './types/ErrorType';
import { Error } from './components/Error/Error';

export const App: React.FC = () => {
  const user = useContext(AuthContext);
  const newTodoField = useRef<HTMLInputElement>(null);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState(FilterType.all);
  const [isAdding, setIsAdding] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState(ErrorType.none);

  const complitedTodos: Todo[] = todos.filter(todo => todo.completed);
  const activeTodos: Todo[] = todos.filter(todo => !todo.completed);

  const loadTodos = async () => {
    try {
      const result = await getTodos(user?.id || 1);

      setTodos(result);
    } catch {
      setHasError(true);
    }
  };

  useEffect(() => {
    if (user) {
      loadTodos();
    }
  }, []);

  useEffect(() => {
    if (newTodoField.current) {
      newTodoField.current.focus();
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setHasError(false);
    }, 3000);
  }, [hasError]);

  const onFormSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const queryTrim = query.trim();

      if (queryTrim) {
        setIsAdding(true);
        try {
          await addTodos({
            userId: user?.id || +new Date(),
            title: queryTrim,
            completed: false,
          });

          await loadTodos();

          setQuery('');
        } catch {
          setErrorType(ErrorType.add);
          setHasError(true);
        } finally {
          setIsAdding(false);
        }
      } else {
        setErrorType(ErrorType.empty);
        setHasError(true);
      }
    }, [query, user],
  );

  const clearCompleted = async () => {
    try {
      setTodos(currTodos => currTodos.map(todo => (
        todo.completed
          ? ({ ...todo, isLoading: true })
          : todo)));

      await Promise.all(complitedTodos.map(todo => (
        deleteTodos(todo.id)
      )));

      loadTodos();
    } catch {
      setHasError(true);
      setErrorType(ErrorType.delete);
    }
  };

  const onRemoveTodo = async (id: number) => {
    setTodos(currTodos => currTodos.map(todo => (
      todo.id === id
        ? ({ ...todo, isLoading: true })
        : todo)));

    try {
      await deleteTodos(id);

      loadTodos();
    } catch {
      setHasError(true);
      setErrorType(ErrorType.delete);
    } finally {
      setHasError(false);
    }
  };

  const onToggleTodo = async (id: number, completed: boolean) => {
    setTodos(currTodos => currTodos.map(todo => (
      todo.id === id
        ? ({ ...todo, isLoading: true })
        : todo)));

    try {
      await updateTodos(id, { completed: !completed });

      loadTodos();
    } catch {
      setHasError(true);
      setErrorType(ErrorType.update);
    } finally {
      setHasError(false);
    }
  };

  const onAllToggleTodo = async () => {
    setTodos(currTodos => currTodos.map(todo => {
      if (!todo.completed) {
        return { ...todo, isLoading: true };
      }

      if (currTodos.every(todoE => todoE.completed)) {
        return { ...todo, isLoading: true };
      }

      return todo;
    }));

    try {
      if (todos.every(todo => todo.completed)) {
        await Promise.all(todos.map(todo => (
          updateTodos(todo.id, { completed: false })
        )));
      } else {
        await Promise.all(activeTodos.map(todo => (
          updateTodos(todo.id, { completed: true })
        )));
      }

      loadTodos();
    } catch {
      setHasError(true);
      setErrorType(ErrorType.update);
    } finally {
      setHasError(false);
    }
  };

  const onRenameTodo = async (todoUpdate: Todo, newTitle: string) => {
    const { title, id } = todoUpdate;

    if (!newTitle) {
      onRemoveTodo(id);
    }

    if (newTitle === title) {
      setHasError(true);
      setErrorType(ErrorType.rename);
    }

    setTodos(currTodos => currTodos.map(todo => (
      todo.id === id
        ? ({ ...todo, isLoading: true })
        : todo)));

    try {
      await updateTodos(id, { title: newTitle });

      await loadTodos();
    } catch {
      setHasError(true);
      setErrorType(ErrorType.update);
    } finally {
      setHasError(false);
    }
  };

  const visibleTodos = useMemo(() => {
    return todos.filter(todo => {
      switch (filterType) {
        case FilterType.completed:
          return todo.completed;
        case FilterType.active:
          return !todo.completed;
        default:
          return true;
      }
    });
  }, [todos, filterType]);

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length > 0 && (
            <button
              data-cy="ToggleAllButton"
              type="button"
              aria-label="Mute volume"
              className={
                classNames(
                  'todoapp__toggle-all', { active: activeTodos.length === 0 },
                )
              }
              onClick={() => onAllToggleTodo()}
            />
          )}
          <NewTodoField
            query={query}
            newTodoField={newTodoField}
            onFormSubmit={onFormSubmit}
            onInputChange={event => setQuery(event.target.value)}
            isAdding={isAdding}
          />
        </header>

        {todos.length > 0 && (
          <>
            <section className="todoapp__main" data-cy="TodoList">
              <TodoList
                todos={visibleTodos}
                isAdding={isAdding}
                onDeleteItem={onRemoveTodo}
                onToggleTodo={onToggleTodo}
                currentTitle={query}
                onRenameTodo={onRenameTodo}
              />
            </section>

            <Footer
              todoItemLeft={activeTodos.length}
              filterType={filterType}
              setFilterType={setFilterType}
              clearCompleted={clearCompleted}
              complitedTodos={complitedTodos}
            />
          </>
        )}
      </div>

      <Error
        errorType={errorType}
        hasError={hasError}
        setHasError={setHasError}
      />

    </div>
  );
};
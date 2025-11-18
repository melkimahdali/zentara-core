<?php

namespace Zentara\Core;

use Closure;
use RuntimeException;

class Application
{
    protected string $basePath;

    /**
     * Simple container bindings.
     *
     * @var array<string, callable|object|string>
     */
    protected array $bindings = [];

    protected array $instances = [];

    public function __construct(string $basePath)
    {
        $this->basePath = $basePath;

        $this->registerBaseBindings();
        $this->registerCoreBindings();
    }

    protected function registerBaseBindings(): void
    {
        $this->instance(self::class, $this);
        $this->instance('app', $this);
    }

    protected function registerCoreBindings(): void
    {
        $this->singleton(\Zentara\Routing\Router::class, fn () => new \Zentara\Routing\Router());
        $this->singleton(\Zentara\View\View::class, fn () => new \Zentara\View\View(
            viewPath: config('zentara.paths.views'),
            cachePath: config('zentara.paths.cache')
        ));
    }

    public function basePath(string $path = ''): string
    {
        return $path ? $this->basePath . DIRECTORY_SEPARATOR . $path : $this->basePath;
    }

    public function bind(string $abstract, callable|string $concrete): void
    {
        $this->bindings[$abstract] = $concrete;
    }

    public function singleton(string $abstract, callable|string $concrete): void
    {
        $this->bindings[$abstract] = function ($app) use ($concrete) {
            static $instance;
            if (! $instance) {
                $instance = is_callable($concrete) ? $concrete($app) : new $concrete();
            }
            return $instance;
        };
    }

    public function instance(string $abstract, object $instance): void
    {
        $this->instances[$abstract] = $instance;
    }

    public function get(string $abstract)
    {
        if (isset($this->instances[$abstract])) {
            return $this->instances[$abstract];
        }

        if (isset($this->bindings[$abstract])) {
            $concrete = $this->bindings[$abstract];

            if ($concrete instanceof Closure) {
                return $this->instances[$abstract] = $concrete($this);
            }

            if (is_string($concrete)) {
                return $this->instances[$abstract] = new $concrete();
            }
        }

        if (class_exists($abstract)) {
            return $this->instances[$abstract] = new $abstract();
        }

        throw new RuntimeException("Unable to resolve binding for {$abstract}");
    }
}

<?php

namespace Zentara\Core;

use Zentara\Http\Request;
use Zentara\Http\Response;
use Zentara\Routing\Router;

class Kernel
{
    public function __construct(
        protected Application $app,
        protected Router $router
    ) {
    }

    public function handle(Request $request): Response
    {
        $routeInfo = $this->router->match($request->getMethod(), $request->getPath());

        if (! $routeInfo) {
            return new Response('Not Found', 404);
        }

        [$handler, $params] = $routeInfo;

        if (is_callable($handler)) {
            $content = $handler($request, ...$params);
        } elseif (is_string($handler) && str_contains($handler, '@')) {
            [$class, $method] = explode('@', $handler, 2);
            $controller = $this->app->get($class);
            $content = $controller->{$method}($request, ...$params);
        } else {
            $content = 'Invalid route handler';
        }

        if ($content instanceof Response) {
            return $content;
        }

        return new Response((string) $content);
    }
}

export function errorHandler(err, req, res, next) {
  console.error('[error]', err);

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

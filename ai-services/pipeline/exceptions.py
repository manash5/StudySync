class PipelineError(Exception):
    """Base class for pipeline-level failures."""


class PipelineConfigError(PipelineError):
    """Raised when required environment or startup configuration is invalid."""


class PipelineValidationError(PipelineError):
    """Raised when uploaded media or intermediate data is invalid."""


class PipelineRuntimeError(PipelineError):
    """Raised when runtime processing fails in external or local pipeline stages."""

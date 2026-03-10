"""领域异常定义"""


class DomainException(Exception):
    """领域异常基类"""
    pass


class DirectoryNotFoundError(DomainException):
    """目录不存在异常"""
    pass


class DirectoryAlreadyExistsError(DomainException):
    """目录已存在异常"""
    pass


class DirectoryNotEmptyError(DomainException):
    """目录不为空异常"""
    pass


class InvalidDirectoryNameError(DomainException):
    """无效目录名称异常"""
    pass


class FileNotFoundError(DomainException):
    """文件不存在异常"""
    pass


class FileAlreadyExistsError(DomainException):
    """文件已存在异常"""
    pass


class InvalidFileNameError(DomainException):
    """无效文件名异常"""
    pass


class FileSizeTooLargeError(DomainException):
    """文件大小超限异常"""
    pass


class UnsupportedFileTypeError(DomainException):
    """不支持的文件类型异常"""
    pass


class TagNotFoundError(DomainException):
    """标签不存在异常"""
    pass


class TagAlreadyExistsError(DomainException):
    """标签已存在异常"""
    pass


class InvalidTagNameError(DomainException):
    """无效标签名称异常"""
    pass


class TagAssociationError(DomainException):
    """标签关联异常"""
    pass
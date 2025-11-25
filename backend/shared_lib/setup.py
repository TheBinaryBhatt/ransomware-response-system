from setuptools import setup, find_packages

setup(
    name='shared_lib',
    version='0.1.0',
    packages=find_packages(include=['shared_lib', 'shared_lib.*']),
    install_requires=[
        'pydantic>=2.0',
        'pydantic-settings>=2.0'
    ],
    python_requires='>=3.10',
)

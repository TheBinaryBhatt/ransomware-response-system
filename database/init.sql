CREATE DATABASE ransomware_db;
CREATE USER soc_user WITH PASSWORD 'securepassword123';
GRANT ALL PRIVILEGES ON DATABASE ransomware_db TO soc_user;
\c ransomware_db;
GRANT ALL ON SCHEMA public TO soc_user;

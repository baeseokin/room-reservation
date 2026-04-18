-- Run this script as a root or administrative user to set up the database and permissions
CREATE DATABASE IF NOT EXISTS roomdb;

-- Create the user if it doesn't exist and set the password
CREATE USER IF NOT EXISTS 'roomuser'@'%' IDENTIFIED BY 'roompass';

-- Grant all privileges on the roomdb database to the roomuser
GRANT ALL PRIVILEGES ON roomdb.* TO 'roomuser'@'%';

-- Apply the changes
FLUSH PRIVILEGES;

USE roomdb;

-- Now you can run the contents of init.sql or just include them here

CREATE TABLE users (
    username varchar(50) PRIMARY KEY,
    password char(60) not null,
    datetime_created timestamp not null
);

CREATE TABLE sports (
    sport_id SERIAL PRIMARY KEY,
    sport_name varchar(50) not null
)

CREATE TABLE brokers (
    broker_id SERIAL PRIMARY KEY,
    broker_name varchar(50) not null
)

CREATE TABLE bets (
    bet_id SERIAL PRIMARY KEY,
    sport_id INTEGER not null,
    broker_id INTEGER not null,
    username varchar(50) not null,
    stake DECIMAL(10, 2) not null,
    datetime timestamp not null,
    odds INTEGER not null,
    team varchar(50) not null,
    profit DECIMAL(10, 2) not null,
    FOREIGN KEY (sport_id) REFERENCES sports(sport_id),
    FOREIGN KEY (broker_id) REFERENCES brokers(broker_id),
    FOREIGN KEY (username) REFERENCES users(username)
);
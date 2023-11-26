update heroku_c9338ae699a67a0.packages set price ='6.50' where id = 1 ;
update heroku_c9338ae699a67a0.packages set price ='8.50' where id = 11 ;
update heroku_c9338ae699a67a0.packages set price ='3.50' where id = 21 ;

ALTER TABLE packages ADD COLUMN productTypeFk INTEGER NOT NULL;


INSERT INTO productTypes ('id','type') values (1, 'Christmas Scheme Cards');

INSERT INTO productTypes ('id','type') values (2, 'New Card Designs');

INSERT INTO productTypes ('id','type') values (3, 'Calendars');

UPDATE packages set productTypeFk = 1 where name = 'Standard Pack';
UPDATE packages set productTypeFk = 1 where name = 'Photo Pack';
UPDATE packages set productTypeFk = 3 where name = 'Calendar';

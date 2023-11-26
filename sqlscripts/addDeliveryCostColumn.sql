ALTER TABLE shippings ADD COLUMN deliveryCostFk INTEGER NOT NULL DEFAULT 1

update shippings set deliveryCostFk = 1 

insert into deliveryCosts (id,name, cost) values (2, 'Standard (*)', '4.00');
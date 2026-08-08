-- Planos de benefício, conforme a tabela que o Luiz passou.
-- DM = danos materiais, DC = danos corporais.
--
-- Confere com o que já estava cadastrado: o valor único de terceiros era
-- R$ 237,00 (= Plano 300) e o da assistência era R$ 195,00 (= Plano 500).
insert into public.beneficio_planos (beneficio_id, codigo, nome, descricao, valor, ordem)
select b.id, v.codigo, v.nome, v.descricao, v.valor, v.ordem
  from public.beneficios b
  join (values
    ('100', 'Plano 100', 'DM: R$ 100.000,00 · DC: R$ 50.000,00 · Danos morais: R$ 30.000,00', 140.00, 1),
    ('150', 'Plano 150', 'DM: R$ 150.000,00 · DC: R$ 75.000,00 · Danos morais: R$ 30.000,00', 173.00, 2),
    ('200', 'Plano 200', 'DM: R$ 200.000,00 · DC: R$ 100.000,00 · Danos morais: R$ 30.000,00', 208.00, 3),
    ('300', 'Plano 300', 'DM: R$ 300.000,00 · DC: R$ 150.000,00 · Danos morais: R$ 30.000,00', 237.00, 4),
    ('400', 'Plano 400', 'DM: R$ 400.000,00 · DC: R$ 200.000,00 · Danos morais: R$ 30.000,00', 268.00, 5),
    ('500', 'Plano 500', 'DM: R$ 500.000,00 · DC: R$ 250.000,00 · Danos morais: R$ 30.000,00', 295.00, 6)
  ) as v(codigo, nome, descricao, valor, ordem) on true
 where b.codigo = 'terceiros'
on conflict (beneficio_id, codigo) do update
   set nome = excluded.nome, descricao = excluded.descricao,
       valor = excluded.valor, ordem = excluded.ordem, ativo = true;

insert into public.beneficio_planos (beneficio_id, codigo, nome, descricao, valor, ordem)
select b.id, v.codigo, v.nome, v.descricao, v.valor, v.ordem
  from public.beneficios b
  join (values
    ('200', 'Plano 200', '400 km totais (ida e volta)',   105.00, 1),
    ('300', 'Plano 300', '600 km totais (ida e volta)',   130.00, 2),
    ('400', 'Plano 400', '800 km totais (ida e volta)',   160.00, 3),
    ('500', 'Plano 500', '1.000 km totais (ida e volta)', 195.00, 4)
  ) as v(codigo, nome, descricao, valor, ordem) on true
 where b.codigo = 'assistencia24h'
on conflict (beneficio_id, codigo) do update
   set nome = excluded.nome, descricao = excluded.descricao,
       valor = excluded.valor, ordem = excluded.ordem, ativo = true;

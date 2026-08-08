-- "Colocar Roubo/Furto": vira uma cobertura só. A de Roubo é reaproveitada
-- (mantém o id, e portanto as propostas antigas continuam coerentes) e a de
-- Furto é desativada em vez de apagada — snapshot antigo não some por isso.
update public.coberturas set nome = 'Roubo/Furto' where nome = 'Roubo';
update public.coberturas set ativo = false, padrao = false where nome = 'Furto';

-- Observações padrão que saem impressas na proposta.
update public.configuracoes set
  telefone_24h = '31994830010',
  observacoes_padrao =
    '1) Não será coberto danos anteriores à cobertura contratada' || E'\n' ||
    '2) A instalação dos equipamentos de segurança é obrigatória e não tem custo para o associado' || E'\n' ||
    '3) Qualquer alteração no veículo durante a cobertura deverá ser informada para manter a vistoria atualizada' || E'\n' ||
    '4) Veículos com passagem por leilão, chassi remarcado, registro de recuperado de sinistro, pequena ou média monta sofrerão depreciação de 30% no valor de mercado e serão cadastrados na categoria correspondente' || E'\n' ||
    '5) Qualquer dúvida, o contato disponível 24 horas é o 31994830010'
 where id;

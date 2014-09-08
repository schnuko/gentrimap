source("helper.R")
library(RPostgreSQL)
library(genefu)
library(calibrate)
library(boot)
library(SDMTools)

con <- dbConnect(dbDriver("PostgreSQL"), dbname = "gentrimap")

tables_sozio <- list()
tables_immo <- list()

#tables_sozio[["immo_ka_quote"]] <- "immo_ew_jung"
#tables_sozio[["immo_al_quote"]] <- "immo_ew_mittel"
#tables_sozio[["immo_auf_quote"]] <- "immo_ew_mittel"
#tables_sozio[["immo_gs_quote"]] <- "immo_ew_alt"

tables_sozio[["immo_ea_quote"]] <- "immo_ew_basis"
tables_immo[["immo_kdu_quote"]] <- "immo_wo_miet"
tables_immo[["immo_eig_quote"]] <- "immo_wo_gesamt"
tables_immo[["immo_miet_preise"]] <- "immo_wo_miet"

directions_sozio <- list()
directions_immo <- list()

#directions_sozio[["immo_ka_quote"]] <- (-1)
#directions_sozio[["immo_al_quote"]] <- (-1)
#directions_sozio[["immo_auf_quote"]] <- (-1)
#directions_sozio[["immo_gs_quote"]] <- (-1)

directions_sozio[["immo_ea_quote"]] <- (-1)
directions_immo[["immo_kdu_quote"]] <- (-1)
directions_immo[["immo_eig_quote"]] <- 1
directions_immo[["immo_miet_preise"]] <- 1

#l_immo_indicators_t1 <- calc_indicators(tables_immo, directions_immo, TRUE)
l_immo_indicators <- calc_indicators(tables_immo, directions_immo, FALSE)

#l_sozio_t1 <- calc_index(tables_sozio, directions_sozio, TRUE) 
l_sozio <- calc_index(tables_sozio, directions_sozio, FALSE) 
#l_immo_t1 <- calc_index(tables_immo, directions_immo, TRUE)
l_immo <- calc_index(tables_immo, directions_immo, FALSE)



#corr(cbind(l_immo_t1$index[,4], l_immo_t12$index[,4]), l_immo_t12$weight)


dbDisconnect(con)


weighted_var <- function(v, w) {
		
	return(weighted.mean((v-weighted.mean(v,w))^2, w))
	
}

weighted_var0 <- function(v,w) {

	if(sum(w)!=1)
		w <- w / sum(w)

	return(sum(w*(v^2)))

}

weighted_sd <- function(v, w) {
		
	return(sqrt(weighted_var(v, w)))
	
}

weighted_sd0 <- function(v,w) {

	return(sqrt(weighted_var0(v,w)))
	
}

calc_indicators <- function(tables, directions, weight_dyn_t1){

	indicators <- list()
	weights_dyn <- list()
	weights_t1 <- list()
	weights_t2 <- list()
	boarders <- list()
	stati_t1 <- list()
	stati_t2 <- list()

	for (table in names(tables)) {

		#print(table)

		q <- data.matrix(dbGetQuery(con, paste("select * from ", table, " where bgid<>98 order by bgid", sep=""))) 
		rownames(q) <- q[,1]
		q_t1 <- q[,2]
		q_t2 <- q[,7]
		
		write.table(data.frame(q), file=paste(table, ".csv", sep=""), sep=",")

		e <- data.matrix(dbGetQuery(con,paste("select * from ", tables[[table]], " where bgid<>98 order by bgid", sep="")))
		rownames(e) <- e[,1]
		e_t1 <- e[,2]
		e_t2 <- e[,7]

		################### Situation zu Zeitpunkt t1 und t2 ##########################

		# absolute Zahl der Erwerbsfähigen der Viertel 
		#e_t1 <- c(4,10,10)
		#e_t2 <- c(6,10,10)

		# Arbeitslosenquoten der Viertel 
		#q_t1 <- c(0.25,0.4,0.3)
		#q_t2 <- c(0.5,0.1,0.2)

		if (table != "immo_miet_preise") {

			# absolute Zahl der Arbeitslosen der Viertel 
			e_AL_t1 <- e_t1 * q_t1
			e_AL_t2 <- e_t2 * q_t2

			# Arbeitslosenquote in der Gesamtstadt 
			Q_t1 <- sum(e_AL_t1)/sum(e_t1)
			Q_t2 <- sum(e_AL_t2)/sum(e_t2)
			
			Q_t1_not <- 1-Q_t1
			Q_t2_not <- 1-Q_t2
	
			q_t1_not <- 1-q_t1
			q_t2_not <- 1-q_t2
		
		} else {

			Q_t1 <- weighted.mean(q_t1, e_t1)
			Q_t2 <- weighted.mean(q_t2, e_t2)
			
		}
		
		
		################################ Status ###################################
		
		weight_t1 <- e_t1 / sum(e_t1)
		weight_t2 <- e_t2 / sum(e_t2)
		
		#dist_t1 <- weighted.mean(abs(q_t1 - Q_t1), weight_t1)
		#status_t1 <- (q_t1 - Q_t1) / dist_t1 * directions[[table]]
		
		status_t1 <- scale(q_t1, center=Q_t1, scale=weighted_sd(q_t1, weight_t1)) * directions[[table]]
		
		#dist_t2 <- weighted.mean(abs(q_t2 - Q_t2), weight_t2)
		#status_t2 <- (q_t2 - Q_t2) / dist_t2 * directions[[table]]
		
		status_t2 <- scale(q_t2, center=Q_t2, scale=weighted_sd(q_t2, weight_t2)) * directions[[table]]

		################################ Veränderungen ###################################

		# relative Veränderung der Arbeitslosenquote in den Vierteln
		g <- (q_t2/q_t1)-1

		# absolute Veränderung der Arbeitslosenquote in den Vierteln
		g_abs <- q_t2-q_t1

		# relative Veränderung der Arbeitslosenquote in der Gesamtstadt
		G <- (Q_t2/Q_t1)-1
		
		# relative Veränderung der Komplementärquote in der Gesamtstadt
		G_not <- (Q_t2_not/Q_t1_not)-1

		# absolute Veränderung der Arbeitslosenquote in der Gesamtstadt
		G_abs <- Q_t2-Q_t1


		############################ Variante 1: Trendanalyse ###############################

		# Trendabweichung als Differenz zwischen tatsächlicher Entwicklung der 
		# AL-Quote in den Vierteln und einem Trendwert (berechnet unter der Annahme 
		# einer Entwicklung in den Vierteln analog zur gesamtstädtische Entwicklung)
	

		# Version 1: Trendabweichung falls Entwicklung im Viertel die absolute 
		# Entwicklung in Gesamtstadt nachvollzogen hätte
		ABS <- q_t2-(q_t1+G_abs)

		# Version 2: Trendabweichung falls Entwicklung im Viertel die relative 
		# Entwicklung in Gesamtstadt nachvollzogen hätte
		
		if(G < 0 || table == "immo_miet_preise") {
		
			DIFF <- q_t2-(q_t1*(G+1))
			G_boarder <- -G
			t1_boarder <- q_t1
			
		} else { 
		
			print("Komplementärfall")
			DIFF <- q_t2-(1-(q_t1_not*(Q_t2_not/Q_t1_not)))
			G_boarder <- G_not
			t1_boarder <- q_t1_not
			
		}

		# Version 3: Vergleich der relativen Entwicklung in Vierteln mit relativer 
		# Entwicklung in Gesamtstadt 
		PPM <- g-G

		# Version 4 dann aber -1 und 1 keine Grenzen
		FAK <- g/G

		# es stellt sich jeweils die Frage wie die Trendabweichungen standardisiert 
		# werden, da bei Änderung der Bevölkerungsanteile der Viertel an der Gesamtstadt
		# der gewichtete Mittelwert nicht mehr 0 ist - >
		# Dividieren durch durchschnittlichen Abstand der Werte zu 0 als Ansatz ('Skalierung')

		relational = data.matrix(data.frame(ABS, DIFF))
		gebietsbez = data.matrix(data.frame(g, g_abs))

		################################ Gewichtungsarten ###################################
		
		if (weight_dyn_t1)
			weighting_dyn <- e_t1 / sum(e_t1)
		else
			weighting_dyn <- ((e_t1 / sum(e_t1)) + (e_t2 / sum(e_t2))) / 2

		# gewichtetes aufsummieren 
		weight_vector <- function(v) {
			sum(weighting_dyn * v)
		}

		# gewichtetes aufsummieren der spalten der matrix 
		weight_matrix <- function(m) {
			apply(m	, 2, weight_vector)	
		}

		############################ Variante 1: weiter ###############################

		# gewichtete mittelwert
		mü_relational <- weight_matrix(relational)
		#mü_relational_matrix <- matrix(mü_relational, length(e_t1), dim(relational)[2], byrow = TRUE)

		# gewichtete abweichung von 0
		pseudo_phi <- sqrt(weight_matrix(relational^2))
		#pseudo_phi_relational_matrix <- matrix(pseudo_phi, length(e_t1), dim(relational)[2], byrow = TRUE)

		# standardabweichung gewichtet
		phi_relational <- sqrt(weight_matrix(scale(relational, center=mü_relational, scale=FALSE)^2))
		#phi_relational <- sqrt(weight_matrix((relational-mü_relational_matrix)^2))
		#phi_relational_matrix <- matrix(phi_relational, length(e_t1), dim(relational)[2], byrow = TRUE)

		# skalierte Werte gewichtet
		#sk_relational <- relational / pseudo_phi_relational_matrix
		sc_relational <- scale(relational, center=FALSE, scale=pseudo_phi)
		boarder_sc_relational <- cbind(-G_abs/pseudo_phi[1], G_boarder*t1_boarder/pseudo_phi[2])

		# z-standardisierte Werte gewichtet
		#st_relational <- (relational - mü_relational_matrix) / phi_relational_matrix
		st_relational <- scale(relational, center=mü_relational, scale=phi_relational)
		boarder_st_relational <- cbind(-G_abs/phi_relational[1], (G_boarder*t1_boarder+mü_relational[2])/phi_relational[2])	

		###################### Variante 2: ohne Vgl zu Gesamtstadt ##########################

		# Version 1: Z-Standardisierung der absoluten Veränderungen in den Vierteln
		
		mean_wtd = weighted.mean(g_abs, weighting_dyn)
		sd_wtd = weighted_sd(g_abs, weighting_dyn)
		
		ga_equally <- scale(g_abs, center=TRUE, scale=TRUE)
		boarder_ga_equally <- -attr(ga_equally, "scaled:center")/attr(ga_equally, "scaled:scale")
		
		ga <- scale(g_abs, center=mean_wtd, scale=sd_wtd)
		boarder_ga <- -mean_wtd/sd_wtd
		
		
		# Version 2: Z-Standardisierung der relativen Veränderungen in den Vierteln NOPE
		# -> geometrische mittel geeigneter (allerdings keine Grenzen -1, 1)
		# Mittelwert der LOGARITHMEN mathematisch äquivalent zu n-te wurzel
		#Z_stand(g)		
		
		
		
		###################### Listen für einzelne Indikatoren ##########################
		
		boarders[[table]] <- cbind(boarder_ga_equally, boarder_ga, boarder_sc_relational, boarder_st_relational[,2]) * directions[[table]]
		indicators[[table]] <- cbind(data.frame(ga_equally), data.frame(ga), sc_relational, st_relational[,2]) * directions[[table]]		
		weights_dyn[[table]] <- weighting_dyn
		weights_t1[[table]] <- weight_t1
		weights_t2[[table]] <- weight_t2
		
		stati_t1[[table]] <- status_t1
		stati_t2[[table]] <- status_t2
		
	}
	
	return(list(indicators=indicators, weights_dyn=weights_dyn, weights_t1=weights_t1, weights_t2=weights_t2, boarders=boarders, stati_t1=stati_t1, stati_t2=stati_t2)) 

}

sum_indicators <- function(l) {

	indicators <- l$indicators
	weights_dyn <- l$weights_dyn
	weights_t1 <- l$weights_t1
	weights_t2 <- l$weights_t2
	boarders <- l$boarders
	stati_t1 <- l$stati_t1
	stati_t2 <- l$stati_t2

	index <- 0
	weight_dyn <- 0
	weight_t1 <- 0
	weight_t2 <- 0
	boarder <- 0
	status_t1 <- 0
	status_t2 <- 0

	for (table in names(indicators)) {
		index <- indicators[[table]] / length(indicators) + index
		weight_dyn <- weights_dyn[[table]] / length(indicators) + weight_dyn
		weight_t1 <- weights_t1[[table]] / length(indicators) + weight_t1
		weight_t2 <- weights_t2[[table]] / length(indicators) + weight_t2
		boarder <- boarders[[table]] / length(indicators) + boarder
		status_t1 <- stati_t1[[table]] / length(indicators) + status_t1
		status_t2 <- stati_t2[[table]] / length(indicators) + status_t2
	}
	
	row.names(index) <- row.names(boarder)
	return(list(index=index, weight_dyn=weight_dyn, weight_t1=weight_t1, weight_t2=weight_t2, boarder=boarder, status_t1=status_t1, status_t2=status_t2))

}

###################### nur bei richtigem index ##########################

scale_sum <- function(l) {

	index <- l$index
	weight_dyn <- l$weight_dyn
	weight_t1 <- l$weight_t1
	weight_t2 <- l$weight_t2
	boarder <- l$boarder
	status_t1 <- l$status_t1
	status_t2 <- l$status_t2

	ga_equally <- scale(index[,1],center=TRUE, scale=TRUE)
	ga <- scale(index[,2],center=weighted.mean(index[,2], weight_dyn), scale=weighted_sd(index[,2], weight_dyn))
	#ABS <- scale(index[,3],center=weighted.mean(index[,3], weight_dyn), scale=weighted_sd(index[,3], weight_dyn))
	#DIFF_sc <- scale(index[,4],center=weighted.mean(index[,4], weight_dyn),scale=weighted_sd(index[,4], weight_dyn))
	DIFF_st <- scale(index[,5],center=weighted.mean(index[,5], weight_dyn),scale=weighted_sd(index[,5], weight_dyn))
	
	#ga <- scale(index[,2],center=FALSE, scale=weighted_sd0(index[,2], weight_dyn))
	ABS <- scale(index[,3],center=FALSE, scale=weighted_sd0(index[,3], weight_dyn))
	DIFF_sc <- scale(index[,4],center=FALSE,scale=weighted_sd0(index[,4], weight_dyn))
	#DIFF_st <- scale(index[,5],center=FALSE,scale=weighted_sd0(index[,5], weight_dyn))
	
	print(c(weighted.mean(index[,1]), weighted.mean(index[,2], weight_dyn), weighted.mean(index[,3], weight_dyn), weighted.mean(index[,4], weight_dyn), weighted.mean(index[,5], weight_dyn)))
	
	index_sc <-  data.frame(ga_equally, ga, ABS, DIFF_sc, DIFF_st)
	row.names(index_sc) <- row.names(boarder)	
	
	boarder_ga_equally <- sqrt(var(index[,1]))
	boarder_ga <- weighted_sd(index[,2], weight_dyn)
	boarder_ABS <- weighted_sd(index[,3], weight_dyn)
	boarder_DIFF_sc <- weighted_sd(index[,4], weight_dyn)
	boarder_DIFF_st <- weighted_sd(index[,5], weight_dyn)
	boarder <- boarder / cbind(rep(boarder_ga_equally, length(weight_dyn)), boarder_ga, boarder_ABS, boarder_DIFF_sc, boarder_DIFF_st)

	#dist_t1 <- weighted.mean(abs(status_t1), weight_t1)
	#status_t1 <- status_t1 / dist_t1
	status_t1 <- scale(status_t1, center=weighted.mean(status_t1, weight_t1) , scale=weighted_sd(status_t1, weight_t1))
	
	
	
	#dist_t2 <- weighted.mean(abs(status_t2), weight_t2)
	#status_t2 <- status_t2 / dist_t2
	status_t2 <- scale(status_t2, center=weighted.mean(status_t2, weight_t2) , scale=weighted_sd(status_t2, weight_t2))
	
	return(list(index = index_sc, weight_dyn=weight_dyn, boarder = boarder, status_t1=status_t1, status_t2=status_t2))
	
}

calc_index <- function(tables, directions, weight_dyn_t1) {

	if(weight_dyn_t1) {
		#print("Gewichtung t1")
	} else {
		#print("Gewichtung t12")
	}

	l1 <- calc_indicators(tables, directions, weight_dyn_t1)
	l2 <- sum_indicators(l1)
	l3 <- scale_sum(l2)

	if(length(tables) == 1) {
	#if(TRUE) {
		return(l2)
	} else {
		return(l3)
	}

}

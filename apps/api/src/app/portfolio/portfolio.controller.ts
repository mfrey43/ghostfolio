import {
  Controller,
  Get,
  Headers,
  HttpException,
  Inject,
  Param,
  Query,
  Res,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { getPermissions, hasPermission, permissions } from 'libs/helper/src';

import {
  hasNotDefinedValuesInObject,
  nullifyValuesInObject
} from '../../helper/object.helper';
import { ExchangeRateDataService } from '../../services/exchange-rate-data.service';
import { ImpersonationService } from '../../services/impersonation.service';
import { RequestWithUser } from '../interfaces/request-with-user.type';
import { PortfolioItem } from './interfaces/portfolio-item.interface';
import { PortfolioOverview } from './interfaces/portfolio-overview.interface';
import { PortfolioPerformance } from './interfaces/portfolio-performance.interface';
import {
  HistoricalDataItem,
  PortfolioPositionDetail
} from './interfaces/portfolio-position-detail.interface';
import { PortfolioPosition } from './interfaces/portfolio-position.interface';
import { PortfolioReport } from './interfaces/portfolio-report.interface';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  public constructor(
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly impersonationService: ImpersonationService,
    private portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async findAll(
    @Headers('impersonation-id') impersonationId
  ): Promise<PortfolioItem[]> {
    let portfolio = await this.portfolioService.findAll(impersonationId);

    if (
      impersonationId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
    ) {
      portfolio = portfolio.map((portfolioItem) => {
        Object.keys(portfolioItem.positions).forEach((symbol) => {
          portfolioItem.positions[symbol].investment =
            portfolioItem.positions[symbol].investment > 0 ? 1 : 0;
          portfolioItem.positions[symbol].investmentInOriginalCurrency =
            portfolioItem.positions[symbol].investmentInOriginalCurrency > 0
              ? 1
              : 0;
          portfolioItem.positions[symbol].quantity =
            portfolioItem.positions[symbol].quantity > 0 ? 1 : 0;
        });

        portfolioItem.investment = null;

        return portfolioItem;
      });
    }

    return portfolio;
  }

  @Get('chart')
  @UseGuards(AuthGuard('jwt'))
  public async getChart(
    @Headers('impersonation-id') impersonationId,
    @Query('range') range,
    @Res() res: Response
  ): Promise<HistoricalDataItem[]> {
    let chartData = await this.portfolioService.getChart(
      impersonationId,
      range
    );

    let hasNullValue = false;

    chartData.forEach((chartDataItem) => {
      if (hasNotDefinedValuesInObject(chartDataItem)) {
        hasNullValue = true;
      }
    });

    if (hasNullValue) {
      res.status(StatusCodes.ACCEPTED);
    }

    if (
      impersonationId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
    ) {
      let maxValue = 0;

      chartData.forEach((portfolioItem) => {
        if (portfolioItem.value > maxValue) {
          maxValue = portfolioItem.value;
        }
      });

      chartData = chartData.map((historicalDataItem) => {
        return {
          ...historicalDataItem,
          marketPrice: Number((historicalDataItem.value / maxValue).toFixed(2))
        };
      });
    }

    return <any>res.json(chartData);
  }

  @Get('details')
  @UseGuards(AuthGuard('jwt'))
  public async getDetails(
    @Headers('impersonation-id') impersonationId,
    @Query('range') range,
    @Res() res: Response
  ): Promise<{ [symbol: string]: PortfolioPosition }> {
    let details: { [symbol: string]: PortfolioPosition } = {};

    const impersonationUserId = await this.impersonationService.validateImpersonationId(
      impersonationId,
      this.request.user.id
    );

    const portfolio = await this.portfolioService.createPortfolio(
      impersonationUserId || this.request.user.id
    );

    try {
      details = await portfolio.getDetails(range);
    } catch (error) {
      console.error(error);

      res.status(StatusCodes.ACCEPTED);
    }

    if (hasNotDefinedValuesInObject(details)) {
      res.status(StatusCodes.ACCEPTED);
    }

    if (
      impersonationId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
    ) {
      const totalInvestment = Object.values(details)
        .map((portfolioPosition) => {
          return portfolioPosition.investment;
        })
        .reduce((a, b) => a + b, 0);

      const totalValue = Object.values(details)
        .map((portfolioPosition) => {
          return this.exchangeRateDataService.toCurrency(
            portfolioPosition.quantity * portfolioPosition.marketPrice,
            portfolioPosition.currency,
            this.request.user.Settings.currency
          );
        })
        .reduce((a, b) => a + b, 0);

      for (const [symbol, portfolioPosition] of Object.entries(details)) {
        portfolioPosition.grossPerformance = null;
        portfolioPosition.investment =
          portfolioPosition.investment / totalInvestment;

        for (const [platform, { current, original }] of Object.entries(
          portfolioPosition.platforms
        )) {
          portfolioPosition.platforms[platform].current = current / totalValue;
          portfolioPosition.platforms[platform].original =
            original / totalInvestment;
        }

        portfolioPosition.quantity = null;
      }
    }

    return <any>res.json(details);
  }

  @Get('overview')
  @UseGuards(AuthGuard('jwt'))
  public async getOverview(
    @Headers('impersonation-id') impersonationId
  ): Promise<PortfolioOverview> {
    let overview = await this.portfolioService.getOverview(impersonationId);

    if (
      impersonationId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
    ) {
      overview = nullifyValuesInObject(overview, [
        'committedFunds',
        'fees',
        'totalBuy',
        'totalSell'
      ]);
    }

    return overview;
  }

  @Get('performance')
  @UseGuards(AuthGuard('jwt'))
  public async getPerformance(
    @Headers('impersonation-id') impersonationId,
    @Query('range') range,
    @Res() res: Response
  ): Promise<PortfolioPerformance> {
    const impersonationUserId = await this.impersonationService.validateImpersonationId(
      impersonationId,
      this.request.user.id
    );

    const portfolio = await this.portfolioService.createPortfolio(
      impersonationUserId || this.request.user.id
    );

    let performance = await portfolio.getPerformance(range);

    if (hasNotDefinedValuesInObject(performance)) {
      res.status(StatusCodes.ACCEPTED);
    }

    if (
      impersonationId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
    ) {
      performance = nullifyValuesInObject(performance, [
        'currentGrossPerformance',
        'currentNetPerformance',
        'currentValue'
      ]);
    }

    return <any>res.json(performance);
  }

  @Get('position/:symbol')
  @UseGuards(AuthGuard('jwt'))
  public async getPosition(
    @Headers('impersonation-id') impersonationId,
    @Param('symbol') symbol
  ): Promise<PortfolioPositionDetail> {
    let position = await this.portfolioService.getPosition(
      impersonationId,
      symbol
    );

    if (position) {
      if (
        impersonationId &&
        !hasPermission(
          getPermissions(this.request.user.role),
          permissions.readForeignPortfolio
        )
      ) {
        position = nullifyValuesInObject(position, ['grossPerformance']);
      }

      return position;
    }

    throw new HttpException(
      getReasonPhrase(StatusCodes.NOT_FOUND),
      StatusCodes.NOT_FOUND
    );
  }

  @Get('report')
  @UseGuards(AuthGuard('jwt'))
  public async getReport(
    @Headers('impersonation-id') impersonationId
  ): Promise<PortfolioReport> {
    const impersonationUserId = await this.impersonationService.validateImpersonationId(
      impersonationId,
      this.request.user.id
    );

    const portfolio = await this.portfolioService.createPortfolio(
      impersonationUserId || this.request.user.id
    );

    let report = await portfolio.getReport();

    if (
      impersonationId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
    ) {
      // TODO: Filter out absolute numbers
    }

    return report;
  }
}
